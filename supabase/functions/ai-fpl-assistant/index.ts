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
    const body = await req.json();

    const question: string = typeof body?.question === 'string' ? body.question.trim() : '';
    if (!question) {
      return new Response(JSON.stringify({ error: 'question is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const team_data = body?.team_data ?? null;
    const gameweek_id: number | null = typeof body?.gameweek_id === 'number' ? body.gameweek_id : null;
    const predictions: Record<string, number> = body?.predictions && typeof body.predictions === 'object' ? body.predictions : {};
    const risk_profile: string = typeof body?.risk_profile === 'string' ? body.risk_profile : 'balanced';
    const conversation_history: Array<{ role: string; content: string }> = Array.isArray(body?.conversation_history)
      ? body.conversation_history.filter((m: any) => m && typeof m.role === 'string' && typeof m.content === 'string')
      : [];

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

    // Fetch current gameweek data
    let currentGameweek: any = null;
    if (gameweek_id) {
      const { data: gwData } = await supabase
        .from('gameweeks')
        .select('*')
        .eq('id', gameweek_id)
        .single();
      currentGameweek = gwData;
    }

    // Fetch rich context in parallel
    const [
      topPredictionsRes,
      allPlayersRes,
      teamsRes,
      fixturesRes,
    ] = await Promise.all([
      // Top predictions for this gameweek
      supabase
        .from('player_predictions')
        .select(`
          predicted_points,
          player:player_id (
            fpl_id, web_name, position, price, form, status, minutes, 
            selected_by_percent, total_points, goals_scored, assists, clean_sheets,
            expected_goals, expected_assists, expected_goal_involvement,
            teams:team_id (name, short_name)
          )
        `)
        .eq('gameweek_id', gameweek_id)
        .order('predicted_points', { ascending: false })
        .limit(30),
      // All active players for validation
      supabase
        .from('players')
        .select('fpl_id, web_name, position, price, form, status, minutes, selected_by_percent, total_points, teams:team_id (short_name)')
        .or('minutes.gt.0,selected_by_percent.gt.0')
        .order('total_points', { ascending: false })
        .limit(300),
      // All teams
      supabase.from('teams').select('id, name, short_name'),
      // Upcoming fixtures
      gameweek_id ? supabase
        .from('fixtures')
        .select('home_team_id, away_team_id, home_team_difficulty, away_team_difficulty, kickoff_time, home_team:home_team_id(short_name), away_team:away_team_id(short_name)')
        .eq('gameweek_id', gameweek_id)
        .eq('finished', false) : Promise.resolve({ data: [] }),
    ]);

    const topPredictions = topPredictionsRes.data;
    const allPlayers = allPlayersRes.data;
    const teams = teamsRes.data;
    const fixtures = (fixturesRes as any).data;

    // Build validated player list for the AI
    const validTeams = (teams || []).map((t: any) => t.short_name).join(', ');

    const activePlayersList = (allPlayers || [])
      .filter((p: any) => p.status !== 'u') // not unavailable
      .slice(0, 150)
      .map((p: any) => `${p.web_name} (${p.teams?.short_name}, ${p.position}, £${p.price}m, form: ${p.form}, pts: ${p.total_points}, sel: ${p.selected_by_percent}%)`)
      .join('\n');

    const fixturesContext = (fixtures || []).map((f: any) =>
      `${f.home_team?.short_name} vs ${f.away_team?.short_name} (H:${f.home_team_difficulty} A:${f.away_team_difficulty})`
    ).join('\n');

    // Build user team context
    const teamContext = team_data ? `
USER'S TEAM:
- Team Name: ${team_data.team_name || 'Unknown'}
- Overall Rank: ${team_data.overall_rank?.toLocaleString() || 'N/A'}
- Overall Points: ${team_data.overall_points || 0}
- Bank: £${(team_data.bank || 0).toFixed(1)}M
- Free Transfers: ${team_data.free_transfers || 1}
- Chips Available: ${Array.isArray(team_data.chips_available) ? team_data.chips_available.join(', ') : 'Unknown'}
` : 'No team data available - user needs to import their team first.';

    const topPlayersContext = topPredictions?.length ? `
TOP PREDICTED PLAYERS THIS GAMEWEEK:
${topPredictions.slice(0, 15).map((p: any, i: number) => 
  `${i + 1}. ${p.player?.web_name} (${p.player?.teams?.short_name}, ${p.player?.position}, £${p.player?.price}m, form: ${p.player?.form}, sel: ${p.player?.selected_by_percent}%) - ${p.predicted_points?.toFixed(1)} predicted pts`
).join('\n')}
` : '';

    const riskContext = risk_profile ? `
USER'S RISK PROFILE: ${risk_profile.toUpperCase()}
- Conservative: Recommend safe, high-ownership picks to protect rank
- Balanced: Mix of template and differential picks
- Aggressive: Recommend bold differentials to chase rank gains
` : '';

    const systemPrompt = `You are **FPL Booster AI**, an expert Fantasy Premier League analyst and assistant.

Your goal is to help users make better FPL decisions using ONLY current and accurate Premier League data provided below.

═══════════════════════════════════════
CRITICAL DATA RULES
═══════════════════════════════════════

1. **ONLY reference players from the ACTIVE PLAYERS LIST below.** These are the only players currently in the Premier League this season.
2. **NEVER** suggest players who have left the Premier League, are retired, or are not in the list below.
3. If you are unsure about a player, respond: "I cannot confirm that player is currently in the Premier League this season."
4. If a user asks about an outdated/transferred player (e.g. "Should I bring in Eden Hazard?"), clearly state they are not available and suggest current alternatives from the list.
5. Prioritize players who are: likely to start, in form, have good upcoming fixtures.

═══════════════════════════════════════
CURRENT SEASON DATA
═══════════════════════════════════════

GAMEWEEK: ${currentGameweek?.name || 'Unknown'}
DEADLINE: ${currentGameweek?.deadline_time || 'Unknown'}

PREMIER LEAGUE TEAMS THIS SEASON:
${validTeams}

THIS GAMEWEEK'S FIXTURES:
${fixturesContext || 'No fixture data available'}

${topPlayersContext}

${teamContext}

${riskContext}

ACTIVE PLAYERS DATABASE (current season only):
${activePlayersList || 'No player data loaded - give general advice only.'}

═══════════════════════════════════════
FPL KNOWLEDGE TO APPLY
═══════════════════════════════════════

When giving advice, consider and incorporate:
- **Form**: Recent performance (last 4-6 gameweeks)
- **Minutes played**: Rotation risk, nailedness
- **Upcoming fixtures**: Difficulty ratings (1=easy, 5=hard)
- **Expected points**: From our prediction model
- **Clean sheet probability**: For DEF/GKP picks
- **Attacking returns**: Goals, assists, bonus points
- **Injury/suspension risk**: Player status flags
- **Price & value**: Points per million, price changes
- **Ownership %**: For captain differentials and EO strategy

═══════════════════════════════════════
RESPONSE FORMAT
═══════════════════════════════════════

Always structure responses with markdown:

**Answer:** [Clear, direct answer to the question]

**Analysis:**
- Reasoning point 1
- Reasoning point 2
- Reference form, fixtures, predicted points, or value

**Suggested Players:** (if relevant)
1. **Player Name** – Team – Position – £Price – Why they are good
2. **Player Name** – Team – Position – £Price – Why they are good

**Strategy Tip:** A short actionable suggestion.

═══════════════════════════════════════
QUERY TYPES TO HANDLE
═══════════════════════════════════════

- Transfer suggestions (in/out recommendations with reasoning)
- Captaincy choices (compare top options with predicted points)
- Wildcard strategy
- Bench decisions (who to bench/start)
- Player comparisons (head-to-head analysis)
- Fixture analysis (easy/hard runs)
- Budget picks (best value under a price)
- Differential picks (low ownership, high upside)
- Chip strategy (when to play BB, TC, FH, WC)

═══════════════════════════════════════
BEHAVIOR RULES
═══════════════════════════════════════

- Be concise, analytical, accurate, and structured
- Never hallucinate players - only use the ACTIVE PLAYERS DATABASE above
- Never reference past FPL seasons unless specifically asked
- Always give actionable advice backed by data
- If the request is unclear, ask a clarifying question (e.g. "Do you want advice for this gameweek or long-term?")
- Use predicted points from the data when available
- Reference fixture difficulty when discussing upcoming games`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversation_history || []).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: question },
    ];

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({
          response: "I'm receiving too many requests right now. Please try again in a moment.",
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({
          response: "AI credits have been exhausted. Please try again later.",
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

    const aiData = await aiResponse.json();
    const responseContent = aiData.choices?.[0]?.message?.content || 
      "I couldn't generate a response. Please try rephrasing your question.";

    return new Response(JSON.stringify({
      response: responseContent,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
