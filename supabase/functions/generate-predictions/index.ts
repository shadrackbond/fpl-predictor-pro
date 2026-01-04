import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const requestSchema = z.object({
  gameweek_id: z.number({
    required_error: 'gameweek_id is required',
    invalid_type_error: 'gameweek_id must be a number'
  }).int({ message: 'gameweek_id must be an integer' }).positive({ message: 'gameweek_id must be positive' }).max(100, { message: 'gameweek_id must be 100 or less' })
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
    
    const { gameweek_id } = parseResult.data;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Generating predictions for gameweek: ${gameweek_id}`);

    // Get gameweek info
    const { data: gameweek } = await supabase
      .from('gameweeks')
      .select('*')
      .eq('id', gameweek_id)
      .single();

    if (!gameweek) {
      throw new Error('Gameweek not found');
    }

    // Get all players with their team info
    const { data: players } = await supabase
      .from('players')
      .select(`
        *,
        teams:team_id (name, short_name, strength_overall)
      `)
      .order('total_points', { ascending: false });

    // Get fixtures for this gameweek
    const { data: fixtures } = await supabase
      .from('fixtures')
      .select(`
        *,
        home_team:home_team_id (id, name, short_name),
        away_team:away_team_id (id, name, short_name)
      `)
      .eq('gameweek_id', gameweek_id);

    // Create a map of team fixtures and difficulties
    const teamFixtures = new Map<number, { opponent: string; difficulty: number; isHome: boolean }>();
    fixtures?.forEach((f: any) => {
      teamFixtures.set(f.home_team_id, {
        opponent: f.away_team?.short_name || 'TBD',
        difficulty: f.home_team_difficulty || 3,
        isHome: true
      });
      teamFixtures.set(f.away_team_id, {
        opponent: f.home_team?.short_name || 'TBD',
        difficulty: f.away_team_difficulty || 3,
        isHome: false
      });
    });

    // Process players in batches for AI analysis
    const batchSize = 20;
    const predictions: any[] = [];
    
    for (let i = 0; i < (players?.length || 0); i += batchSize) {
      const batch = players!.slice(i, i + batchSize);
      
      const playerData = batch.map((p: any) => {
        const fixture = teamFixtures.get(p.team_id);
        return {
          id: p.id,
          name: p.web_name,
          position: p.position,
          team: p.teams?.short_name,
          price: p.price,
          form: p.form,
          total_points: p.total_points,
          minutes: p.minutes,
          goals: p.goals_scored,
          assists: p.assists,
          clean_sheets: p.clean_sheets,
          bonus: p.bonus,
          selected_by: p.selected_by_percent,
          status: p.status,
          fixture_difficulty: fixture?.difficulty || 3,
          opponent: fixture?.opponent || 'TBD',
          is_home: fixture?.isHome ?? true,
        };
      });

      const prompt = `You are an FPL (Fantasy Premier League) expert analyst. Analyze these players and predict their expected points for ${gameweek.name}.

Consider these factors:
1. Recent form (higher form = better recent performances)
2. Fixture difficulty (1-5 scale, 1 is easiest)
3. Home/Away advantage
4. Position (GKP can get clean sheet points, attackers get goal/assist points)
5. Minutes played (low minutes = rotation risk)
6. Status (a=available, d=doubtful, i=injured)
7. Bonus point potential

Players data:
${JSON.stringify(playerData, null, 2)}

Return a JSON array with predictions for each player. Each object must have:
- id: player id
- predicted_points: expected FPL points (realistic range 0-15, most players 2-6)
- brief_analysis: 1-2 sentence analysis

Only return the JSON array, no other text.`;

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
              { role: 'system', content: 'You are an FPL expert. Always respond with valid JSON arrays only.' },
              { role: 'user', content: prompt }
            ],
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI API error: ${aiResponse.status}`);
          // Fallback to basic prediction
          batch.forEach((p: any) => {
            const fixture = teamFixtures.get(p.team_id);
            const basePts = p.form * 0.5 + (p.total_points / Math.max(1, p.minutes / 90)) * 0.3;
            const difficultyFactor = (6 - (fixture?.difficulty || 3)) / 5;
            predictions.push({
              player_id: p.id,
              gameweek_id,
              predicted_points: Math.round((basePts * difficultyFactor + 2) * 10) / 10,
              fixture_difficulty: fixture?.difficulty || 3,
              form_factor: p.form / 10,
              ai_analysis: `Form: ${p.form}, Fixture difficulty: ${fixture?.difficulty || 3}`,
            });
          });
          continue;
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || '[]';
        
        // Parse AI response
        let aiPredictions: any[] = [];
        try {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            aiPredictions = JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          console.error('Error parsing AI response:', parseError);
        }

        // Map AI predictions back to players
        batch.forEach((p: any) => {
          const fixture = teamFixtures.get(p.team_id);
          const aiPred = aiPredictions.find((pred: any) => pred.id === p.id);
          
          if (aiPred) {
            predictions.push({
              player_id: p.id,
              gameweek_id,
              predicted_points: Math.max(0, Math.min(20, aiPred.predicted_points || 2)),
              fixture_difficulty: fixture?.difficulty || 3,
              form_factor: p.form / 10,
              ai_analysis: aiPred.brief_analysis || '',
            });
          } else {
            // Fallback calculation
            const basePts = p.form * 0.5 + 2;
            const difficultyFactor = (6 - (fixture?.difficulty || 3)) / 5;
            predictions.push({
              player_id: p.id,
              gameweek_id,
              predicted_points: Math.round(basePts * difficultyFactor * 10) / 10,
              fixture_difficulty: fixture?.difficulty || 3,
              form_factor: p.form / 10,
              ai_analysis: 'Basic prediction based on form and fixture.',
            });
          }
        });

      } catch (batchError) {
        console.error('Batch processing error:', batchError);
      }
    }

    // Upsert predictions
    console.log(`Upserting ${predictions.length} predictions...`);
    const { error: predError } = await supabase
      .from('player_predictions')
      .upsert(predictions, { onConflict: 'player_id,gameweek_id' });

    if (predError) {
      console.error('Predictions upsert error:', predError);
      throw predError;
    }

    // Generate optimal team
    const optimalTeam = await generateOptimalTeam(supabase, gameweek_id, predictions, lovableApiKey);

    return new Response(JSON.stringify({
      success: true,
      predictions_count: predictions.length,
      optimal_team: optimalTeam,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-predictions:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateOptimalTeam(
  supabase: any, 
  gameweek_id: number, 
  predictions: any[],
  apiKey: string
) {
  // Get player details
  const { data: players } = await supabase
    .from('players')
    .select('id, web_name, position, price, team_id');

  const playerMap = new Map(players?.map((p: any) => [p.id, p]) || []);
  
  // Enrich predictions with player data
  const enrichedPreds = predictions.map(pred => {
    const playerData = playerMap.get(pred.player_id);
    return {
      ...pred,
      ...(playerData || {}),
    };
  });

  // Group by position
  const byPosition: Record<string, any[]> = { GKP: [], DEF: [], MID: [], FWD: [] };
  enrichedPreds.forEach(p => {
    if (byPosition[p.position]) {
      byPosition[p.position].push(p);
    }
  });

  // Sort each position by predicted points
  Object.values(byPosition).forEach(arr => arr.sort((a, b) => b.predicted_points - a.predicted_points));

  // Simple greedy selection for optimal 15-player squad
  const BUDGET = 100;
  const squad: any[] = [];
  let totalCost = 0;
  const teamCounts: Record<number, number> = {};

  const canAdd = (player: any) => {
    if (totalCost + player.price > BUDGET) return false;
    if ((teamCounts[player.team_id] || 0) >= 3) return false;
    return true;
  };

  const addPlayer = (player: any) => {
    squad.push(player);
    totalCost += player.price;
    teamCounts[player.team_id] = (teamCounts[player.team_id] || 0) + 1;
  };

  // Select 2 GKP, 5 DEF, 5 MID, 3 FWD
  const quotas: Record<string, number> = { GKP: 2, DEF: 5, MID: 5, FWD: 3 };

  for (const [pos, quota] of Object.entries(quotas)) {
    let added = 0;
    for (const player of byPosition[pos]) {
      if (added >= quota) break;
      if (canAdd(player)) {
        addPlayer(player);
        added++;
      }
    }
  }

  // Select starting XI (best 11 with valid formation)
  // Formation: 1 GKP + at least 3 DEF + at least 2 MID + at least 1 FWD
  const squadByPos: Record<string, any[]> = { GKP: [], DEF: [], MID: [], FWD: [] };
  squad.forEach(p => squadByPos[p.position]?.push(p));

  // Sort by predicted points within squad
  Object.values(squadByPos).forEach(arr => arr.sort((a, b) => b.predicted_points - a.predicted_points));

  // Start with minimum formation: 1-3-3-1
  const startingXI: any[] = [
    squadByPos.GKP[0],
    ...squadByPos.DEF.slice(0, 3),
    ...squadByPos.MID.slice(0, 3),
    squadByPos.FWD[0],
  ].filter(Boolean);

  // Fill remaining 3 spots with best available
  const remaining = [
    ...squadByPos.DEF.slice(3),
    ...squadByPos.MID.slice(3),
    ...squadByPos.FWD.slice(1),
  ].filter(Boolean).sort((a, b) => b.predicted_points - a.predicted_points);

  for (const player of remaining) {
    if (startingXI.length >= 11) break;
    startingXI.push(player);
  }

  // Determine formation
  const xiByPos = { GKP: 0, DEF: 0, MID: 0, FWD: 0 };
  startingXI.forEach(p => xiByPos[p.position as keyof typeof xiByPos]++);
  const formation = `${xiByPos.DEF}-${xiByPos.MID}-${xiByPos.FWD}`;

  // Captain and vice captain (highest predicted points)
  const sortedXI = [...startingXI].sort((a, b) => b.predicted_points - a.predicted_points);
  const captain = sortedXI[0];
  const viceCaptain = sortedXI[1];

  // Calculate total predicted points (captain counts double)
  let totalPredicted = startingXI.reduce((sum, p) => sum + p.predicted_points, 0);
  totalPredicted += captain?.predicted_points || 0; // Captain bonus

  // Calculate team rating (based on historical context, max realistic is ~150 pts)
  const rating = Math.min(100, Math.round((totalPredicted / 100) * 100));

  // Generate AI analysis for the team
  let analysis = '';
  try {
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'user', 
            content: `Analyze this FPL optimal team selection in 2-3 sentences:
Formation: ${formation}
Captain: ${captain?.web_name}
Total predicted points: ${totalPredicted.toFixed(1)}
Top players: ${sortedXI.slice(0, 5).map((p: any) => `${p.web_name} (${p.predicted_points.toFixed(1)} pts)`).join(', ')}` 
          }
        ],
      }),
    });

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      analysis = aiData.choices?.[0]?.message?.content || '';
    }
  } catch (e) {
    console.error('Analysis generation error:', e);
  }

  // Save optimal team
  const optimalTeam = {
    gameweek_id,
    player_ids: squad.map(p => p.id),
    starting_xi: startingXI.map(p => p.id),
    captain_id: captain?.id,
    vice_captain_id: viceCaptain?.id,
    total_predicted_points: totalPredicted,
    team_rating: rating,
    formation,
    analysis,
  };

  await supabase
    .from('optimal_teams')
    .upsert(optimalTeam, { onConflict: 'gameweek_id' });

  return optimalTeam;
}
