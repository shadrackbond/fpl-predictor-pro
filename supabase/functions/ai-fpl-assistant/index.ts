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

    // Get top predictions for context
    const { data: topPredictions } = await supabase
      .from('player_predictions')
      .select(`
        predicted_points,
        player:player_id (
          web_name, position, price, form,
          teams:team_id (short_name)
        )
      `)
      .eq('gameweek_id', gameweek_id)
      .order('predicted_points', { ascending: false })
      .limit(20);

    // Build context for AI
    const teamContext = team_data ? `
USER'S TEAM:
- Team Name: ${team_data.team_name || 'Unknown'}
- Overall Rank: ${team_data.overall_rank?.toLocaleString() || 'N/A'}
- Overall Points: ${team_data.overall_points || 0}
- Bank: £${(team_data.bank || 0).toFixed(1)}M
- Free Transfers: ${team_data.free_transfers || 1}
- Chips Available: ${Array.isArray(team_data.chips_available) ? team_data.chips_available.join(', ') : 'Unknown'}
` : 'No team data available - user needs to import their team first.';

    const predictionsContext = predictions && Object.keys(predictions).length > 0 ? `
PLAYER PREDICTIONS (ID: predicted points):
${Object.entries(predictions).slice(0, 15).map(([id, pts]) => `${id}: ${pts}`).join(', ')}
` : '';

    const topPlayersContext = topPredictions?.length ? `
TOP PREDICTED PLAYERS THIS GAMEWEEK:
${topPredictions.slice(0, 10).map((p: any, i: number) => 
  `${i + 1}. ${p.player?.web_name} (${p.player?.teams?.short_name}) - ${p.predicted_points?.toFixed(1)} pts`
).join('\n')}
` : '';

    const riskContext = risk_profile ? `
USER'S RISK PROFILE: ${risk_profile.toUpperCase()}
- Conservative: Recommend safe, high-ownership picks to protect rank
- Balanced: Mix of template and differential picks
- Aggressive: Recommend bold differentials to chase rank gains
` : '';

    const systemPrompt = `You are an expert FPL (Fantasy Premier League) AI assistant. You help managers make decisions about their teams.

CURRENT CONTEXT:
- Gameweek: ${currentGameweek?.name || 'Unknown'}
- Deadline: ${currentGameweek?.deadline_time || 'Unknown'}

${teamContext}
${predictionsContext}
${topPlayersContext}
${riskContext}

GUIDELINES:
1. Always provide reasoning, not just yes/no answers
2. Consider the user's rank and goals when giving advice
3. Reference specific predicted points when recommending players
4. For captain picks, consider ownership % and differential potential
5. For transfers, consider upcoming fixtures and form
6. Be concise but thorough - users want actionable insights
7. If data is missing, acknowledge it and give general advice
8. For chip advice, consider optimal timing based on fixtures

RESPONSE FORMAT:
- Start with a direct answer
- Follow with 2-3 key reasons
- End with any caveats or alternatives to consider`;

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
        model: 'google/gemini-3-flash-preview',
        messages,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
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
