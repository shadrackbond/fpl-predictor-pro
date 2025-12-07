import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fpl_team_id, gameweek_id } = await req.json();
    
    if (!fpl_team_id) {
      throw new Error('FPL Team ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Fetching user team: ${fpl_team_id} for gameweek: ${gameweek_id}`);

    // Fetch user's FPL team data from FPL API
    const entryResponse = await fetch(`https://fantasy.premierleague.com/api/entry/${fpl_team_id}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!entryResponse.ok) {
      throw new Error(`Failed to fetch FPL team: ${entryResponse.status}. Please check your FPL ID.`);
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

    // Fetch user's picks for the gameweek
    const picksResponse = await fetch(
      `https://fantasy.premierleague.com/api/entry/${fpl_team_id}/event/${fplGwId}/picks/`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    let picksData: any = null;
    if (picksResponse.ok) {
      picksData = await picksResponse.json();
    }

    // Fetch user's transfer history
    const transfersResponse = await fetch(
      `https://fantasy.premierleague.com/api/entry/${fpl_team_id}/transfers/`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    let transfersData: any[] = [];
    if (transfersResponse.ok) {
      transfersData = await transfersResponse.json();
    }

    // Map FPL player IDs to our player IDs
    const fplPlayerIds = picksData?.picks?.map((p: any) => p.element) || [];
    
    const { data: ourPlayers } = await supabase
      .from('players')
      .select('id, fpl_id, web_name, position, price, form, total_points, team_id, teams:team_id(short_name)')
      .in('fpl_id', fplPlayerIds);

    const fplToOurId = new Map(ourPlayers?.map(p => [p.fpl_id, p.id]) || []);
    const playerMap = new Map(ourPlayers?.map(p => [p.fpl_id, p]) || []);

    const ourPlayerIds = fplPlayerIds.map((fplId: number) => fplToOurId.get(fplId)).filter(Boolean);

    // Find captain and vice captain
    const captainFplId = picksData?.picks?.find((p: any) => p.is_captain)?.element;
    const viceCaptainFplId = picksData?.picks?.find((p: any) => p.is_vice_captain)?.element;

    // Fetch chip history from the history endpoint
    const historyResponse = await fetch(
      `https://fantasy.premierleague.com/api/entry/${fpl_team_id}/history/`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    let historyData: any = null;
    if (historyResponse.ok) {
      historyData = await historyResponse.json();
    }

    // Determine chips available from history
    const allChips = ['wildcard', 'freehit', 'bboost', '3xc'];
    const chipNameMap: Record<string, string> = {
      'wildcard': 'wildcard',
      'freehit': 'freehit', 
      'bboost': 'bboost',
      '3xc': 'triple_captain'
    };
    
    // Get chips used from history endpoint
    const chipsUsed = historyData?.chips || [];
    console.log('Chips used from history:', JSON.stringify(chipsUsed));
    
    const chipsAvailable = allChips
      .filter(chip => !chipsUsed.some((used: any) => used.name === chip))
      .map(chip => chipNameMap[chip] || chip);

    // Save or update user team
    const userTeamData = {
      fpl_team_id,
      team_name: entryData.name,
      overall_rank: entryData.summary_overall_rank,
      overall_points: entryData.summary_overall_points,
      gameweek_points: entryData.summary_event_points,
      free_transfers: picksData?.entry_history?.event_transfers || 1,
      bank: (picksData?.entry_history?.bank || 0) / 10,
      active_chip: picksData?.active_chip,
      chips_available: chipsAvailable,
      player_ids: ourPlayerIds,
      captain_id: fplToOurId.get(captainFplId),
      vice_captain_id: fplToOurId.get(viceCaptainFplId),
      updated_at: new Date().toISOString(),
    };

    const { data: savedTeam, error: saveError } = await supabase
      .from('user_teams')
      .upsert(userTeamData, { onConflict: 'fpl_team_id' })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving team:', saveError);
      throw saveError;
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

    // Find the best captain candidate (highest predicted points)
    const bestCaptainCandidate = userPlayersData.reduce((best, player) => 
      player.predicted_points > (best?.predicted_points || 0) ? player : best
    , userPlayersData[0]);

    const aiPrompt = `You are an FPL expert. Analyze this user's team and suggest the best transfers and optimal lineup.

USER'S TEAM (15 players):
${JSON.stringify(userPlayersData, null, 2)}

TOP AVAILABLE PLAYERS:
${JSON.stringify(topReplacements, null, 2)}

FREE TRANSFERS: ${freeTransfers}
BANK: £${bank.toFixed(1)}M
CHIPS AVAILABLE: ${chipsAvailable.join(', ') || 'None'}
BEST CAPTAIN CANDIDATE: ${bestCaptainCandidate?.name} (${bestCaptainCandidate?.predicted_points?.toFixed(1)} predicted points)

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
      "best_candidate": "<player name if applicable, especially for triple_captain>",
      "candidate_predicted_points": <number if applicable>
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
- For Triple Captain: recommend the player with highest predicted points AND easy fixture. Include their name in best_candidate.
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

  // Find best captain candidate
  const bestCandidate = sortedByPoints[0];

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
