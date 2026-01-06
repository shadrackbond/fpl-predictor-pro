import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const requestSchema = z.object({
  fpl_team_id: z.number({
    required_error: 'FPL Team ID is required',
    invalid_type_error: 'FPL Team ID must be a number'
  }).int({ message: 'FPL Team ID must be an integer' }).positive({ message: 'FPL Team ID must be positive' }).max(100000000, { message: 'FPL Team ID is too large' }),
  gameweek_id: z.number().int().positive().max(100).nullable().optional()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate input
    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      console.error('Validation error:', parseResult.error.errors);
      return new Response(JSON.stringify({ 
        error: 'Invalid input', 
        details: parseResult.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const { fpl_team_id, gameweek_id } = parseResult.data;

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to resolve the invoking user from the Authorization header (access token)
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
    let invokingUser: any = null;
    if (accessToken) {
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
        if (userErr) console.warn('Failed to get user from token:', userErr);
        invokingUser = userData?.user ?? null;
      } catch (e) {
        console.warn('Error fetching user from token', e);
      }
    }

    if (!invokingUser) {
      console.warn('No authenticated user found in request');
      return new Response(JSON.stringify({ error: 'Unauthorized - missing or invalid auth token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Fetching user team: ${fpl_team_id} for gameweek: ${gameweek_id}`);

    // Use browser-like headers — some FPL endpoints block minimal bot headers
    const fplHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://fantasy.premierleague.com/',
      'Origin': 'https://fantasy.premierleague.com'
    };

    // Fetch user's FPL team data from FPL API (try once, retry on 403)
    let entryResponse = await fetch(`https://fantasy.premierleague.com/api/entry/${fpl_team_id}/`, { headers: fplHeaders });
    if (!entryResponse.ok && entryResponse.status === 403) {
      const body = await entryResponse.text().catch(() => '');
      console.warn(`FPL returned 403 on first attempt: ${body}`);
      // Retry with the same headers once in case of transient block
      entryResponse = await fetch(`https://fantasy.premierleague.com/api/entry/${fpl_team_id}/`, { headers: fplHeaders });
    }

    if (!entryResponse.ok) {
      const body = await entryResponse.text().catch(() => '');
      console.error(`Failed to fetch FPL team: ${entryResponse.status}`, body);
      throw new Error(`Failed to fetch FPL team: ${entryResponse.status}. ${body ? 'Remote message: ' + body : 'Please check your FPL ID or that the FPL API is reachable from this environment.'}`);
    }

    const entryData = await entryResponse.json();
    console.log(`Team found: ${entryData.name}`);

    // Get the next gameweek (for planning) or current if next not available
    let targetGwId = gameweek_id;
    if (!targetGwId) {
      // First try to get the next gameweek (the one we're planning for)
      const { data: nextGw } = await supabase
        .from('gameweeks')
        .select('id, fpl_id')
        .eq('is_next', true)
        .maybeSingle();

      if (nextGw) {
        targetGwId = nextGw.id;
      } else {
        // Fallback to current gameweek if next isn't set
        const { data: currentGw } = await supabase
          .from('gameweeks')
          .select('id, fpl_id')
          .eq('is_current', true)
          .maybeSingle();
        targetGwId = currentGw?.id;
      }
    }

    console.log(`Using gameweek ID: ${targetGwId}`);

    // Get gameweek fpl_id for API calls
    const { data: gwData } = await supabase
      .from('gameweeks')
      .select('fpl_id')
      .eq('id', targetGwId)
      .single();

    const fplGwId = gwData?.fpl_id || 1;

    // Fetch user's picks for the gameweek - try target gameweek first, then fallback to most recent
    let picksData: any = null;
    let actualPicksGw = fplGwId;

    const fetchPicks = async (gw: number) => {
      const res = await fetch(
        `https://fantasy.premierleague.com/api/entry/${fpl_team_id}/event/${gw}/picks/`,
        { headers: fplHeaders }
      );
      if (!res.ok) return null;
      return await res.json();
    };

    // First try target gameweek
    picksData = await fetchPicks(fplGwId);

    // If no picks for target gameweek, find the most recent gameweek with picks
    if (!picksData?.picks?.length) {
      console.log(`No picks found for GW ${fplGwId}, searching for most recent picks...`);

      // Get the current event from entry data to know the latest available gameweek
      const currentEvent = entryData.current_event || fplGwId;

      // Try to fetch picks from the most recent completed gameweek
      for (let gw = currentEvent; gw >= 1; gw--) {
        const fallbackData = await fetchPicks(gw);
        if (fallbackData?.picks?.length) {
          picksData = fallbackData;
          actualPicksGw = gw;
          console.log(`Found picks from GW ${gw}`);
          break;
        }
      }
    }

    if (!picksData?.picks?.length) {
      throw new Error('Could not find any team picks. Please make sure you have set up your team on the FPL website.');
    }

    console.log(`Using team picks from GW ${actualPicksGw}, analyzing for GW ${fplGwId}`);

    // Fetch user's transfer history (best-effort)
    let transfersData: any[] = [];
    try {
      const transfersResponse = await fetch(
        `https://fantasy.premierleague.com/api/entry/${fpl_team_id}/transfers/`,
        { headers: fplHeaders }
      );
      if (transfersResponse.ok) {
        transfersData = await transfersResponse.json();
      }
    } catch (e) {
      console.warn('Failed to fetch transfer history (non-blocking):', e);
    }

    // Map FPL player IDs to our player IDs
    const fplPlayerIds = picksData?.picks?.map((p: any) => p.element) || [];

    const { data: ourPlayers } = await supabase
      .from('players')
      .select('id, fpl_id, web_name, position, price, form, total_points, team_id, teams:team_id(short_name)')
      .in('fpl_id', fplPlayerIds);

    const fplToOurId = new Map(ourPlayers?.map(p => [p.fpl_id, p.id]) || []);
    const ourPlayerIds = fplPlayerIds
      .map((fplId: number) => fplToOurId.get(fplId))
      .filter((v: any) => typeof v === 'number');

    // Derive actual starting XI from picks (position 1-11 are starters)
    const sortedPicks = [...(picksData?.picks || [])].sort((a: any, b: any) => a.position - b.position);
    const startingFplIds = sortedPicks.filter((p: any) => p.position <= 11).map((p: any) => p.element);
    const benchFplIds = sortedPicks.filter((p: any) => p.position > 11).map((p: any) => p.element);

    const startingOurIds: number[] = startingFplIds
      .map((id: number) => fplToOurId.get(id))
      .filter((v: any) => typeof v === 'number');

    const benchOurIds: number[] = benchFplIds
      .map((id: number) => fplToOurId.get(id))
      .filter((v: any) => typeof v === 'number');

    // Find captain and vice captain
    const captainFplId = picksData?.picks?.find((p: any) => p.is_captain)?.element;
    const viceCaptainFplId = picksData?.picks?.find((p: any) => p.is_vice_captain)?.element;

    const captainOurId: number | null = (typeof captainFplId === 'number' ? (fplToOurId.get(captainFplId) ?? null) : null);
    const viceCaptainOurId: number | null = (typeof viceCaptainFplId === 'number' ? (fplToOurId.get(viceCaptainFplId) ?? null) : null);

    // Keep at most one row per user + team id
    const { data: existingTeam } = await supabase
      .from('user_teams')
      .select('id, chips_available')
      .eq('user_id', invokingUser.id)
      .eq('fpl_team_id', fpl_team_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch chip history from the history endpoint
    let historyData: any = null;
    try {
      let historyResponse = await fetch(
        `https://fantasy.premierleague.com/api/entry/${fpl_team_id}/history/`,
        { headers: fplHeaders }
      );

      if (!historyResponse.ok && historyResponse.status === 403) {
        const body = await historyResponse.text().catch(() => '');
        console.warn(`FPL history returned 403 on first attempt: ${body}`);
        historyResponse = await fetch(
          `https://fantasy.premierleague.com/api/entry/${fpl_team_id}/history/`,
          { headers: fplHeaders }
        );
      }

      if (historyResponse.ok) {
        historyData = await historyResponse.json();
      } else {
        const body = await historyResponse.text().catch(() => '');
        console.warn(`Failed to fetch chip history: ${historyResponse.status}`, body);
      }
    } catch (e) {
      console.warn('Failed to fetch chip history (non-blocking):', e);
    }

    // Determine chips available from history
    const chipLimits: Record<string, number> = {
      wildcard: 2,
      freehit: 1,
      bboost: 1,
      '3xc': 1,
    };

    const chipNameMap: Record<string, string> = {
      wildcard: 'wildcard',
      freehit: 'freehit',
      bboost: 'bboost',
      '3xc': 'triple_captain',
    };

    const defaultChipsAvailable = Object.keys(chipLimits).map(chip => chipNameMap[chip] || chip);

    let chipsAvailable: string[] = defaultChipsAvailable;
    if (historyData) {
      const chipsUsed = Array.isArray(historyData?.chips) ? historyData.chips : [];
      console.log('Chips used from history:', JSON.stringify(chipsUsed));

      const usedCounts = chipsUsed.reduce((acc: Record<string, number>, used: any) => {
        const name = used?.name;
        if (typeof name === 'string') {
          acc[name] = (acc[name] || 0) + 1;
        }
        return acc;
      }, {});

      chipsAvailable = Object.keys(chipLimits)
        .filter((chip) => (usedCounts[chip] || 0) < chipLimits[chip])
        .map(chip => chipNameMap[chip] || chip);
    } else if (Array.isArray(existingTeam?.chips_available)) {
      chipsAvailable = existingTeam.chips_available as string[];
    }

    // Save or update user team (scoped to the authenticated user)
    const userTeamData = {
      fpl_team_id,
      user_id: invokingUser.id,
      team_name: entryData.name,
      overall_rank: entryData.summary_overall_rank,
      overall_points: entryData.summary_overall_points,
      gameweek_points: entryData.summary_event_points,
      free_transfers: picksData?.entry_history?.event_transfers || 1,
      bank: (picksData?.entry_history?.bank || 0) / 10,
      active_chip: picksData?.active_chip,
      chips_available: chipsAvailable,
      player_ids: ourPlayerIds,
      captain_id: captainOurId,
      vice_captain_id: viceCaptainOurId,
      updated_at: new Date().toISOString(),
    };

    let savedTeam: any = null;

    if (existingTeam?.id) {
      const { data, error } = await supabase
        .from('user_teams')
        .update(userTeamData)
        .eq('id', existingTeam.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating team:', error);
        throw error;
      }
      savedTeam = data;
    } else {
      const { data, error } = await supabase
        .from('user_teams')
        .insert(userTeamData)
        .select()
        .single();

      if (error) {
        console.error('Error saving team:', error);
        throw error;
      }
      savedTeam = data;
    }

    console.log('Team saved, generating transfer suggestions...');

    // Get predictions for the gameweek
    const { data: predictions } = await supabase
      .from('player_predictions')
      .select(`
        *,
        player:player_id (
          id, web_name, position, price, form, total_points, team_id,
          teams:team_id (short_name)
        )
      `)
      .eq('gameweek_id', targetGwId)
      .order('predicted_points', { ascending: false });

    // Get fixtures for difficulty analysis
    const { data: fixtures } = await supabase
      .from('fixtures')
      .select(`
        *,
        home_team:home_team_id (id, short_name),
        away_team:away_team_id (id, short_name)
      `)
      .eq('gameweek_id', targetGwId);

    // Create fixture difficulty map
    const teamDifficulty = new Map<number, { opponent: string; difficulty: number }>();
    fixtures?.forEach((f: any) => {
      teamDifficulty.set(f.home_team_id, {
        opponent: f.away_team?.short_name || 'TBD',
        difficulty: f.home_team_difficulty || 3
      });
      teamDifficulty.set(f.away_team_id, {
        opponent: f.home_team?.short_name || 'TBD',
        difficulty: f.away_team_difficulty || 3
      });
    });

    // Get user's current players with predictions
    const userPlayerPreds = predictions?.filter(p =>
      ourPlayerIds.includes(p.player_id)
    ) || [];

    // Get all other players not in user's team
    const otherPlayerPreds = predictions?.filter(p =>
      !ourPlayerIds.includes(p.player_id)
    ) || [];

    // Calculate team counts to respect max 3 per team rule
    const teamCounts: Record<number, number> = {};
    ourPlayers?.forEach(p => {
      teamCounts[p.team_id] = (teamCounts[p.team_id] || 0) + 1;
    });

    // Prepare data for AI analysis
    const userPlayersData = userPlayerPreds.map(pred => ({
      id: pred.player_id,
      name: pred.player?.web_name,
      position: pred.player?.position,
      team: pred.player?.teams?.short_name,
      price: pred.player?.price,
      form: pred.player?.form,
      predicted_points: pred.predicted_points,
      fixture_difficulty: teamDifficulty.get(pred.player?.team_id)?.difficulty || 3,
      opponent: teamDifficulty.get(pred.player?.team_id)?.opponent || 'TBD',
    }));

    // Get top potential replacements for each position
    const topReplacements: any[] = [];
    const positions = ['GKP', 'DEF', 'MID', 'FWD'];

    positions.forEach(pos => {
      const posPlayers = otherPlayerPreds
        .filter(p => p.player?.position === pos)
        .slice(0, 10)
        .map(pred => ({
          id: pred.player_id,
          name: pred.player?.web_name,
          position: pred.player?.position,
          team: pred.player?.teams?.short_name,
          team_id: pred.player?.team_id,
          price: pred.player?.price,
          form: pred.player?.form,
          predicted_points: pred.predicted_points,
          fixture_difficulty: teamDifficulty.get(pred.player?.team_id)?.difficulty || 3,
        }));
      topReplacements.push(...posPlayers);
    });

    // Use AI to analyze transfers
    const freeTransfers = picksData?.entry_history?.event_transfers || 1;
    const bank = (picksData?.entry_history?.bank || 0) / 10;

    // Find the best captain candidate in user's team (highest predicted points)
    const bestCaptainCandidate = userPlayersData.reduce((best, player) =>
      player.predicted_points > (best?.predicted_points || 0) ? player : best
      , userPlayersData[0]);

    // Find the best overall captain candidate across ALL FPL players
    const allPlayersForTC = predictions?.map(pred => ({
      id: pred.player_id,
      name: pred.player?.web_name,
      team: pred.player?.teams?.short_name,
      predicted_points: pred.predicted_points,
      fixture_difficulty: teamDifficulty.get(pred.player?.team_id)?.difficulty || 3,
    })) || [];

    const bestOverallTC = allPlayersForTC.reduce((best, player) =>
      player.predicted_points > (best?.predicted_points || 0) ? player : best
      , allPlayersForTC[0]);

    const aiPrompt = `You are an FPL expert. Analyze this user's team and suggest the best transfers and optimal lineup.

USER'S TEAM (15 players):
${JSON.stringify(userPlayersData, null, 2)}

TOP AVAILABLE PLAYERS:
${JSON.stringify(topReplacements, null, 2)}

FREE TRANSFERS: ${freeTransfers}
BANK: £${bank.toFixed(1)}M
CHIPS AVAILABLE: ${chipsAvailable.join(', ') || 'None'}
BEST CAPTAIN CANDIDATE IN MY TEAM: ${bestCaptainCandidate?.name} (${bestCaptainCandidate?.predicted_points?.toFixed(1)} predicted points)
BEST CAPTAIN CANDIDATE IN ALL FPL: ${bestOverallTC?.name} from ${bestOverallTC?.team} (${bestOverallTC?.predicted_points?.toFixed(1)} predicted points)

Rules:
1. Max 3 players from any single team
2. Current team counts: ${JSON.stringify(teamCounts)}
3. Consider fixture difficulty (1-5, lower is easier)
4. Consider form and predicted points
5. Starting XI must have: 1 GK, at least 3 DEF, at least 2 MID, at least 1 FWD (total 11 players)

Provide analysis in this exact JSON format:
{
  "transfers": [
    {
      "player_out_id": <id>,
      "player_out_name": "<name>",
      "player_in_id": <id>,
      "player_in_name": "<name>",
      "priority": "high" | "medium" | "low",
      "points_impact": <number>,
      "reason": "<brief reason>"
    }
  ],
  "suggested_lineup": [<array of 11 player IDs for starting XI, sorted by predicted points>],
  "chip_analysis": [
    {
      "chip_name": "<wildcard|freehit|bboost|triple_captain>",
      "success_percentage": <0-100>,
      "recommendation": "use" | "save",
      "analysis": "<brief analysis with specific timing advice>",
      "best_candidate": "<player name from user's team if applicable>",
      "candidate_predicted_points": <number if applicable>,
      "best_overall_candidate": "<best player name in ALL of FPL for triple_captain>",
      "best_overall_candidate_team": "<team short name>",
      "best_overall_candidate_points": <predicted points>
    }
  ],
  "team_comparison": {
    "current_predicted_points": <number>,
    "optimal_potential_points": <number>,
    "performance_diff": <percentage>
  }
}

IMPORTANT Analysis Guidelines:
- Only suggest transfers that improve the team significantly
- Prioritize by points_impact (difference in predicted points)
- Mark as "high" priority if impact > 3 points, "medium" if 1-3, "low" if < 1
- For Triple Captain: Include BOTH best_candidate (from user's team) AND best_overall_candidate (from all FPL players). This helps users know if they should transfer in the best TC option.
- For Bench Boost: consider when ALL bench players have good fixtures
- For Wildcard: recommend when team needs 4+ changes
- For Free Hit: recommend during blank/double gameweeks
- suggested_lineup should be the 11 players (by ID) who will score the most points this gameweek`;

    let aiResult: any = null;
    try {
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are an FPL expert analyst. Return only valid JSON.' },
            { role: 'user', content: aiPrompt }
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error(`AI API error: ${aiResponse.status}`, errorText);
        // Provide fallback analysis
        aiResult = generateFallbackAnalysis(userPlayerPreds, otherPlayerPreds, freeTransfers, chipsAvailable);
      } else {
        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || '{}';

        // Parse JSON from AI response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiResult = JSON.parse(jsonMatch[0]);
        } else {
          aiResult = generateFallbackAnalysis(userPlayerPreds, otherPlayerPreds, freeTransfers, chipsAvailable);
        }
      }
    } catch (aiError) {
      console.error('AI analysis error:', aiError);
      aiResult = generateFallbackAnalysis(userPlayerPreds, otherPlayerPreds, freeTransfers, chipsAvailable);
    }

    // Normalize team comparison so numbers are stable and match the Optimal Team page
    const predictedByPlayerId = new Map<number, number>();
    (predictions || []).forEach((p: any) => {
      if (typeof p?.player_id === 'number') predictedByPlayerId.set(p.player_id, p.predicted_points || 0);
    });

    const effectiveStartingXI = (startingOurIds.length === 11)
      ? startingOurIds
      : ourPlayerIds.slice(0, 11);

    const sumStarting = effectiveStartingXI.reduce((sum: number, id: number) => sum + (predictedByPlayerId.get(id) || 0), 0);
    const captainBonus = (captainOurId && effectiveStartingXI.includes(captainOurId))
      ? (predictedByPlayerId.get(captainOurId) || 0)
      : 0;

    const currentPredictedPoints = Math.round((sumStarting + captainBonus) * 10) / 10;

    const { data: optimalRow } = await supabase
      .from('optimal_teams')
      .select('total_predicted_points')
      .eq('gameweek_id', targetGwId)
      .maybeSingle();

    const optimalPotentialPoints = Math.round(((optimalRow?.total_predicted_points ?? 0) as number) * 10) / 10;
    const performanceDiff = optimalPotentialPoints > 0
      ? Math.round((currentPredictedPoints / optimalPotentialPoints) * 100)
      : 0;

    aiResult = {
      ...(aiResult || {}),
      team_comparison: {
        current_predicted_points: currentPredictedPoints,
        optimal_potential_points: optimalPotentialPoints,
        performance_diff: performanceDiff,
      },
    };

    // Save transfer suggestions
    if (aiResult?.transfers?.length > 0) {
      // Clear old suggestions
      await supabase
        .from('transfer_suggestions')
        .delete()
        .eq('user_team_id', savedTeam.id);

      // Insert new suggestions
      const suggestionsToInsert = aiResult.transfers.map((t: any) => ({
        user_team_id: savedTeam.id,
        gameweek_id: targetGwId,
        player_out_id: t.player_out_id,
        player_in_id: t.player_in_id,
        priority: t.priority,
        points_impact: t.points_impact,
        reason: t.reason,
      }));

      await supabase
        .from('transfer_suggestions')
        .insert(suggestionsToInsert);
    }

    // Save chip analysis
    if (aiResult?.chip_analysis?.length > 0) {
      // Clear old analysis
      await supabase
        .from('chip_analysis')
        .delete()
        .eq('user_team_id', savedTeam.id);

      // Insert new analysis
      const chipAnalysisToInsert = aiResult.chip_analysis.map((c: any) => ({
        user_team_id: savedTeam.id,
        gameweek_id: targetGwId,
        chip_name: c.chip_name,
        success_percentage: c.success_percentage,
        recommendation: c.recommendation,
        analysis: c.analysis,
      }));

      await supabase
        .from('chip_analysis')
        .insert(chipAnalysisToInsert);
    }

    // Get predictions for user's players to include in response
    const playerPredictionsMap: Record<number, number> = {};
    userPlayerPreds.forEach(pred => {
      if (pred.player_id) {
        playerPredictionsMap[pred.player_id] = pred.predicted_points;
      }
    });

    return new Response(JSON.stringify({
      success: true,
      team: savedTeam,
      transfers: aiResult?.transfers || [],
      suggested_lineup: aiResult?.suggested_lineup || [],
      starting_xi: (startingOurIds.length === 11 ? startingOurIds : []),
      chip_analysis: aiResult?.chip_analysis || [],
      team_comparison: aiResult?.team_comparison || null,
      user_players: ourPlayers,
      player_predictions: playerPredictionsMap,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-user-team:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateFallbackAnalysis(
  userPlayerPreds: any[],
  otherPlayerPreds: any[],
  freeTransfers: number,
  chipsAvailable: string[]
) {
  // Simple fallback: find lowest performing players and suggest replacements
  const sortedUserPlayers = [...userPlayerPreds].sort((a, b) => a.predicted_points - b.predicted_points);
  const sortedByPoints = [...userPlayerPreds].sort((a, b) => b.predicted_points - a.predicted_points);

  const transfers: any[] = [];

  for (let i = 0; i < Math.min(3, sortedUserPlayers.length); i++) {
    const playerOut = sortedUserPlayers[i];
    const position = playerOut.player?.position;

    // Find best replacement in same position
    const replacement = otherPlayerPreds.find(p =>
      p.player?.position === position &&
      p.player?.price <= (playerOut.player?.price || 0) + 0.5
    );

    if (replacement && replacement.predicted_points > playerOut.predicted_points) {
      const impact = replacement.predicted_points - playerOut.predicted_points;
      transfers.push({
        player_out_id: playerOut.player_id,
        player_out_name: playerOut.player?.web_name,
        player_in_id: replacement.player_id,
        player_in_name: replacement.player?.web_name,
        priority: impact > 3 ? 'high' : impact > 1 ? 'medium' : 'low',
        points_impact: Math.round(impact * 10) / 10,
        reason: `${replacement.player?.web_name} has better predicted points (${replacement.predicted_points.toFixed(1)}) vs ${playerOut.player?.web_name} (${playerOut.predicted_points.toFixed(1)})`
      });
    }
  }

  // Generate suggested lineup - exactly 11 players respecting formation rules
  const suggestedLineup: number[] = [];
  const gks = sortedByPoints.filter(p => p.player?.position === 'GKP');
  const defs = sortedByPoints.filter(p => p.player?.position === 'DEF');
  const mids = sortedByPoints.filter(p => p.player?.position === 'MID');
  const fwds = sortedByPoints.filter(p => p.player?.position === 'FWD');

  // Must have exactly: 1 GK, at least 3 DEF, at least 2 MID, at least 1 FWD = 7 minimum
  // Need to fill remaining 4 spots with best available from DEF/MID/FWD
  if (gks[0]) suggestedLineup.push(gks[0].player_id);

  // Start with minimum: 3 DEF, 2 MID, 1 FWD
  defs.slice(0, 3).forEach(p => suggestedLineup.push(p.player_id));
  mids.slice(0, 2).forEach(p => suggestedLineup.push(p.player_id));
  fwds.slice(0, 1).forEach(p => suggestedLineup.push(p.player_id));

  // Fill remaining 4 spots with best available outfield players not already selected
  const remainingPlayers = [...defs.slice(3), ...mids.slice(2), ...fwds.slice(1)]
    .filter(p => p.player_id && !suggestedLineup.includes(p.player_id))
    .sort((a, b) => b.predicted_points - a.predicted_points);

  for (const p of remainingPlayers) {
    if (suggestedLineup.length >= 11) break;
    suggestedLineup.push(p.player_id);
  }

  // Find best captain candidate in user's team
  const bestCandidate = sortedByPoints[0];

  // Find best overall captain candidate from ALL players
  const bestOverallCandidate = otherPlayerPreds.reduce((best, pred) =>
    pred.predicted_points > (best?.predicted_points || 0) ? pred : best
    , otherPlayerPreds[0]);

  // Enhanced chip analysis with candidates
  const chipAnalysis = chipsAvailable.map(chip => {
    if (chip === 'triple_captain') {
      return {
        chip_name: chip,
        success_percentage: bestCandidate && bestCandidate.predicted_points > 8 ? 65 : 30,
        recommendation: bestCandidate && bestCandidate.predicted_points > 10 ? 'use' : 'save',
        analysis: bestCandidate
          ? `${bestCandidate.player?.web_name} has ${bestCandidate.predicted_points.toFixed(1)} predicted points. ${bestCandidate.predicted_points > 10 ? 'Great week for TC!' : 'Consider waiting for a better opportunity.'}`
          : 'Analyze fixture difficulty for best TC timing.',
        best_candidate: bestCandidate?.player?.web_name,
        candidate_predicted_points: bestCandidate?.predicted_points,
        best_overall_candidate: bestOverallCandidate?.player?.web_name,
        best_overall_candidate_team: bestOverallCandidate?.player?.teams?.short_name,
        best_overall_candidate_points: bestOverallCandidate?.predicted_points,
      };
    }
    return {
      chip_name: chip,
      success_percentage: chip === 'wildcard' ? 45 : chip === 'freehit' ? 40 : 35,
      recommendation: 'save',
      analysis: `Consider saving ${chip} for a better opportunity. Look for blank/double gameweeks.`
    };
  });

  // Calculate team comparison
  const currentPoints = userPlayerPreds.reduce((sum, p) => sum + (p.predicted_points || 0), 0);
  const topPlayers = [...otherPlayerPreds].slice(0, 15);
  const optimalPoints = topPlayers.reduce((sum, p) => sum + (p.predicted_points || 0), 0);

  return {
    transfers,
    suggested_lineup: suggestedLineup,
    chip_analysis: chipAnalysis,
    team_comparison: {
      current_predicted_points: Math.round(currentPoints * 10) / 10,
      optimal_potential_points: Math.round(optimalPoints * 10) / 10,
      performance_diff: optimalPoints > 0 ? Math.round((currentPoints / optimalPoints) * 100) : 0
    }
  };
}
