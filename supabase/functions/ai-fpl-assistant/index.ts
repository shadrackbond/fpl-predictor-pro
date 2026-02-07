import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  question: z.string().min(1).max(1000),
  team_data: z.any().optional(),
  gameweek_id: z.number().nullable().optional(),
  predictions: z.record(z.number()).optional(),
  conversation_history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
  risk_profile: z.enum(['conservative', 'balanced', 'aggressive']).optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input',
        details: parseResult.error.errors,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { question, team_data, gameweek_id, predictions, conversation_history, risk_profile } = parseResult.data;

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !lovableApiKey) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all data in parallel for maximum speed
    const [
      gameweekResult,
      allGameweeksResult,
      teamsResult,
      topPredictionsResult,
      topScorersResult,
      topAssistsResult,
      topFormResult,
      injuredPlayersResult,
      fixturesResult,
      recentFixturesResult,
      priceChangesResult,
      differentialsResult,
      predictionHistoryResult,
    ] = await Promise.all([
      // Current gameweek
      gameweek_id 
        ? supabase.from('gameweeks').select('*').eq('id', gameweek_id).single()
        : Promise.resolve({ data: null }),
      
      // All gameweeks for season overview
      supabase.from('gameweeks').select('id, name, finished, is_current, is_next, average_score, highest_score').order('fpl_id', { ascending: true }),
      
      // All teams
      supabase.from('teams').select('id, name, short_name, strength_overall, strength_attack_home, strength_attack_away, strength_defence_home, strength_defence_away').order('strength_overall', { ascending: false }),
      
      // Top predictions this gameweek
      gameweek_id
        ? supabase.from('player_predictions').select(`
            predicted_points, fixture_difficulty, form_factor, ai_analysis,
            player:player_id (
              id, web_name, position, price, form, total_points, selected_by_percent, status, minutes,
              goals_scored, assists, clean_sheets, bonus, expected_goals, expected_assists,
              teams:team_id (short_name, name)
            )
          `).eq('gameweek_id', gameweek_id).order('predicted_points', { ascending: false }).limit(30)
        : Promise.resolve({ data: [] }),
      
      // Top scorers (season)
      supabase.from('players').select(`
        web_name, position, price, total_points, goals_scored, assists, form, selected_by_percent, minutes,
        teams:team_id (short_name)
      `).order('total_points', { ascending: false }).limit(20),
      
      // Top assists (season)
      supabase.from('players').select(`
        web_name, position, price, assists, total_points, form, selected_by_percent,
        teams:team_id (short_name)
      `).order('assists', { ascending: false }).limit(10),
      
      // In-form players
      supabase.from('players').select(`
        web_name, position, price, form, total_points, goals_scored, assists, selected_by_percent,
        expected_goals, expected_assists,
        teams:team_id (short_name)
      `).gt('form', 5).order('form', { ascending: false }).limit(15),
      
      // Injured/unavailable players
      supabase.from('players').select(`
        web_name, position, status, price, selected_by_percent,
        teams:team_id (short_name)
      `).neq('status', 'a').gt('selected_by_percent', 3).order('selected_by_percent', { ascending: false }).limit(20),
      
      // Upcoming fixtures this gameweek
      gameweek_id
        ? supabase.from('fixtures').select(`
            kickoff_time, home_score, away_score, finished, home_team_difficulty, away_team_difficulty,
            home_team:teams!fixtures_home_team_id_fkey (name, short_name),
            away_team:teams!fixtures_away_team_id_fkey (name, short_name)
          `).eq('gameweek_id', gameweek_id).order('kickoff_time', { ascending: true })
        : Promise.resolve({ data: [] }),
      
      // Recent finished fixtures (last gameweek)
      gameweek_id
        ? supabase.from('fixtures').select(`
            home_score, away_score, finished,
            home_team:teams!fixtures_home_team_id_fkey (short_name),
            away_team:teams!fixtures_away_team_id_fkey (short_name)
          `).eq('gameweek_id', gameweek_id - 1).eq('finished', true).limit(10)
        : Promise.resolve({ data: [] }),
      
      // Recent price changes
      supabase.from('price_changes').select(`
        old_price, new_price, change_date,
        player:player_id (web_name, teams:team_id (short_name))
      `).order('change_date', { ascending: false }).limit(15),
      
      // Active differential alerts
      gameweek_id
        ? supabase.from('differential_alerts').select(`
            alert_type, confidence, ownership_percent, predicted_points, reason,
            player:player_id (web_name, position, price, teams:team_id (short_name))
          `).eq('gameweek_id', gameweek_id).eq('is_active', true).order('confidence', { ascending: false }).limit(10)
        : Promise.resolve({ data: [] }),
      
      // Prediction accuracy history
      supabase.from('prediction_history').select('*').order('gameweek_id', { ascending: false }).limit(5),
    ]);

    const currentGameweek = gameweekResult.data;
    const allGameweeks = allGameweeksResult.data || [];
    const teams = teamsResult.data || [];
    const topPredictions = topPredictionsResult.data || [];
    const topScorers = topScorersResult.data || [];
    const topAssists = topAssistsResult.data || [];
    const topForm = topFormResult.data || [];
    const injuredPlayers = injuredPlayersResult.data || [];
    const fixtures = fixturesResult.data || [];
    const recentFixtures = recentFixturesResult.data || [];
    const priceChanges = priceChangesResult.data || [];
    const differentials = differentialsResult.data || [];
    const predictionHistory = predictionHistoryResult.data || [];

    // --- Build comprehensive context ---
    
    const seasonProgress = allGameweeks.filter((gw: any) => gw.finished).length;
    const totalGameweeks = allGameweeks.length;

    const seasonContext = `
SEASON OVERVIEW:
- Progress: Gameweek ${seasonProgress} of ${totalGameweeks} completed
- Current Gameweek: ${currentGameweek?.name || 'Unknown'}
- Deadline: ${currentGameweek?.deadline_time ? new Date(currentGameweek.deadline_time).toLocaleString('en-GB') : 'Unknown'}
- Avg Score This GW: ${currentGameweek?.average_score || 'TBD'}
- Highest Score This GW: ${currentGameweek?.highest_score || 'TBD'}`;

    const teamsContext = teams.length ? `
ALL PREMIER LEAGUE TEAMS (ranked by overall strength):
${teams.map((t: any, i: number) => 
  `${i + 1}. ${t.name} (${t.short_name}) - Overall: ${t.strength_overall}, Att(H/A): ${t.strength_attack_home}/${t.strength_attack_away}, Def(H/A): ${t.strength_defence_home}/${t.strength_defence_away}`
).join('\n')}` : '';

    const fixturesContext = fixtures.length ? `
GAMEWEEK FIXTURES:
${fixtures.map((f: any) => {
  const status = f.finished ? `${f.home_score}-${f.away_score}` : (f.kickoff_time ? new Date(f.kickoff_time).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : 'TBC');
  return `${f.home_team?.short_name} vs ${f.away_team?.short_name} [${status}] (FDR: H${f.home_team_difficulty} A${f.away_team_difficulty})`;
}).join('\n')}` : '';

    const recentResultsContext = recentFixtures.length ? `
LAST GAMEWEEK RESULTS:
${recentFixtures.map((f: any) => `${f.home_team?.short_name} ${f.home_score}-${f.away_score} ${f.away_team?.short_name}`).join(', ')}` : '';

    const topScorersContext = topScorers.length ? `
TOP SCORERS (SEASON):
${topScorers.slice(0, 15).map((p: any, i: number) => 
  `${i + 1}. ${p.web_name} (${p.teams?.short_name}, ${p.position}) - ${p.total_points}pts, ${p.goals_scored}G ${p.assists}A, £${p.price}m, ${p.selected_by_percent}% owned, Form: ${p.form}`
).join('\n')}` : '';

    const topAssistsContext = topAssists.length ? `
TOP ASSISTS (SEASON):
${topAssists.map((p: any, i: number) => 
  `${i + 1}. ${p.web_name} (${p.teams?.short_name}) - ${p.assists}A, ${p.total_points}pts, £${p.price}m`
).join('\n')}` : '';

    const inFormContext = topForm.length ? `
IN-FORM PLAYERS (form > 5.0):
${topForm.map((p: any, i: number) => 
  `${i + 1}. ${p.web_name} (${p.teams?.short_name}, ${p.position}) - Form: ${p.form}, ${p.goals_scored}G ${p.assists}A, xG: ${p.expected_goals}, xA: ${p.expected_assists}, £${p.price}m, ${p.selected_by_percent}%`
).join('\n')}` : '';

    const predictionsContext2 = topPredictions.length ? `
TOP PREDICTED PLAYERS THIS GAMEWEEK:
${topPredictions.slice(0, 20).map((p: any, i: number) => 
  `${i + 1}. ${p.player?.web_name} (${p.player?.teams?.short_name}, ${p.player?.position}) - Pred: ${p.predicted_points?.toFixed(1)}pts, Form: ${p.player?.form}, FDR: ${p.fixture_difficulty}, £${p.player?.price}m, ${p.player?.selected_by_percent}% owned`
).join('\n')}` : '';

    const injuredContext = injuredPlayers.length ? `
INJURED/UNAVAILABLE PLAYERS (ownership > 3%):
${injuredPlayers.map((p: any) => {
  const statusMap: Record<string, string> = { 'd': 'Doubtful', 'i': 'Injured', 's': 'Suspended', 'u': 'Unavailable', 'n': 'Not available' };
  return `- ${p.web_name} (${p.teams?.short_name}, ${p.position}) - ${statusMap[p.status] || p.status}, ${p.selected_by_percent}% owned, £${p.price}m`;
}).join('\n')}` : '';

    const priceContext = priceChanges.length ? `
RECENT PRICE CHANGES:
${priceChanges.map((pc: any) => {
  const change = pc.new_price - pc.old_price;
  const arrow = change > 0 ? '📈' : '📉';
  return `${arrow} ${pc.player?.web_name} (${pc.player?.teams?.short_name}): £${pc.old_price}m → £${pc.new_price}m (${change > 0 ? '+' : ''}${change.toFixed(1)}m)`;
}).join('\n')}` : '';

    const differentialsContext = differentials.length ? `
DIFFERENTIAL PICKS (low ownership, high upside):
${differentials.map((d: any, i: number) => 
  `${i + 1}. ${d.player?.web_name} (${d.player?.teams?.short_name}, ${d.player?.position}) - Pred: ${d.predicted_points?.toFixed(1)}pts, ${d.ownership_percent}% owned, Confidence: ${(d.confidence * 100).toFixed(0)}%, Reason: ${d.reason}`
).join('\n')}` : '';

    const teamContext = team_data ? `
USER'S TEAM:
- Team Name: ${team_data.team_name || 'Unknown'}
- Overall Rank: ${team_data.overall_rank?.toLocaleString() || 'N/A'}
- Overall Points: ${team_data.overall_points || 0}
- Bank: £${(team_data.bank || 0).toFixed(1)}M
- Free Transfers: ${team_data.free_transfers || 1}
- Active Chip: ${team_data.active_chip || 'None'}
- Chips Available: ${Array.isArray(team_data.chips_available) ? team_data.chips_available.join(', ') : 'Unknown'}
` : 'No team data available - user needs to import their team first.';

    const userPredictions = predictions && Object.keys(predictions).length > 0 ? `
USER'S PLAYER PREDICTIONS (player_id: predicted points):
${Object.entries(predictions).slice(0, 15).map(([id, pts]) => `${id}: ${pts}`).join(', ')}
` : '';

    const riskContext = risk_profile ? `
USER'S RISK PROFILE: ${risk_profile.toUpperCase()}
- Conservative: Recommend safe, high-ownership picks to protect rank
- Balanced: Mix of template and differential picks
- Aggressive: Recommend bold differentials to chase rank gains
` : '';

    const accuracyContext = predictionHistory.length ? `
PREDICTION ACCURACY HISTORY:
${predictionHistory.map((ph: any) => 
  `GW${ph.gameweek_id}: Predicted ${ph.total_predicted_points?.toFixed(0)}pts, Actual ${ph.total_actual_points?.toFixed(0) || 'TBD'}pts, Accuracy ${ph.accuracy_percentage?.toFixed(1) || 'TBD'}%`
).join('\n')}` : '';

    const systemPrompt = `You are an expert FPL (Fantasy Premier League) AI assistant with deep knowledge of the current 2024/25 Premier League season. You have access to comprehensive, real-time data about every team, player, and fixture.

${seasonContext}

${teamsContext}

${fixturesContext}

${recentResultsContext}

${topScorersContext}

${topAssistsContext}

${inFormContext}

${predictionsContext2}

${injuredContext}

${priceContext}

${differentialsContext}

${accuracyContext}

${teamContext}
${userPredictions}
${riskContext}

GUIDELINES:
1. You have COMPLETE data on all 20 Premier League teams, fixtures, players, and predictions
2. Always back up advice with specific stats (points, form, xG, xA, ownership %, price)
3. Reference fixture difficulty ratings (FDR 1-5) when discussing upcoming matches
4. Consider injured/unavailable players when recommending transfers
5. For captain picks, compare predicted points, ownership, and fixture difficulty
6. For transfers, cross-reference form, fixtures, price changes, and differential potential
7. Mention price rises/falls when relevant to transfer decisions
8. Use our prediction accuracy track record to give confidence context
9. Be concise but thorough - use **bold** for key stats and player names
10. Format responses with markdown: headers, bullet points, bold text for readability
11. If you don't have enough data for a question, say so honestly

RESPONSE FORMAT:
- Use markdown formatting for clarity
- Start with a direct answer
- Support with relevant data points
- End with any caveats or alternatives`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversation_history || []).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: question },
    ];

    console.log('AI Assistant: sending request with comprehensive PL data context');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        max_tokens: 1200,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({
          error: 'Rate limit exceeded. Please wait a moment and try again.',
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({
          error: 'AI credits depleted. Please add credits to your workspace.',
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        response: "I'm having trouble processing that request. Please try again in a moment.",
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Stream the response back
    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('AI Assistant error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      response: "Sorry, I encountered an error. Please try again.",
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
