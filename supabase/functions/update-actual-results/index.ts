/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({ gameweek_id: z.number().int().positive().max(100) });
const round = (value: number, digits = 1) => {
  const power = 10 ** digits;
  return Math.round(value * power) / power;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Invalid gameweek id' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { gameweek_id } = parsed.data;
    const { data: gameweek, error: gameweekError } = await supabase
      .from('gameweeks')
      .select('*')
      .eq('id', gameweek_id)
      .single();

    if (gameweekError || !gameweek) throw new Error('Gameweek not found');
    if (!gameweek.finished) {
      return json({ error: 'This gameweek is not finished. Sync FPL data after the final match before scoring the model.' }, 409);
    }

    const liveResponse = await fetch(`https://fantasy.premierleague.com/api/event/${gameweek.fpl_id}/live/`);
    if (!liveResponse.ok) throw new Error(`FPL live API returned ${liveResponse.status}`);
    const liveData = await liveResponse.json();

    const [{ data: players, error: playerError }, { data: predictions, error: predictionError }] = await Promise.all([
      supabase.from('players').select('id, fpl_id'),
      supabase.from('player_predictions').select('*').eq('gameweek_id', gameweek_id),
    ]);
    if (playerError) throw playerError;
    if (predictionError) throw predictionError;
    if (!predictions?.length) throw new Error('No predictions exist for this gameweek');

    const fplIdByPlayerId = new Map((players || []).map(player => [player.id, player.fpl_id]));
    const pointsByFplId = new Map((liveData.elements || []).map((entry: any) => [entry.id, Number(entry.stats?.total_points || 0)]));
    const scored = predictions.flatMap(prediction => {
      const fplId = fplIdByPlayerId.get(prediction.player_id);
      if (!fplId || !pointsByFplId.has(fplId)) return [];
      const actual = Number(pointsByFplId.get(fplId));
      const predicted = Number(prediction.predicted_points);
      const symmetricScore = 100 * (1 - Math.abs(predicted - actual) / (Math.abs(predicted) + Math.abs(actual) + 2));
      return [{
        ...prediction,
        actual_points: actual,
        prediction_accuracy: round(Math.max(0, symmetricScore), 1),
        updated_at: new Date().toISOString(),
      }];
    });

    for (let index = 0; index < scored.length; index += 150) {
      const { error } = await supabase
        .from('player_predictions')
        .upsert(scored.slice(index, index + 150), { onConflict: 'player_id,gameweek_id' });
      if (error) throw error;
    }

    const errors = scored.map(row => Number(row.actual_points) - Number(row.predicted_points));
    const mae = errors.reduce((sum, errorValue) => sum + Math.abs(errorValue), 0) / errors.length;
    const rmse = Math.sqrt(errors.reduce((sum, errorValue) => sum + errorValue ** 2, 0) / errors.length);
    const bias = errors.reduce((sum, errorValue) => sum + errorValue, 0) / errors.length;
    const correctPredictions = errors.filter(errorValue => Math.abs(errorValue) <= 2).length;
    const withinTwoPercentage = correctPredictions / errors.length * 100;
    const overallScore = scored.reduce((sum, row) => sum + Number(row.prediction_accuracy), 0) / scored.length;
    const totalPredicted = scored.reduce((sum, row) => sum + Number(row.predicted_points), 0);
    const totalActual = scored.reduce((sum, row) => sum + Number(row.actual_points), 0);

    const { data: optimalTeam } = await supabase
      .from('optimal_teams')
      .select('*')
      .eq('gameweek_id', gameweek_id)
      .maybeSingle();
    if (optimalTeam) {
      const actualByPlayerId = new Map(scored.map(row => [row.player_id, Number(row.actual_points)]));
      const teamActual = (optimalTeam.starting_xi || []).reduce((sum: number, playerId: number) => {
        const points = actualByPlayerId.get(playerId) || 0;
        return sum + points + (playerId === optimalTeam.captain_id ? points : 0);
      }, 0);
      const teamScore = 100 * (1 - Math.abs(Number(optimalTeam.total_predicted_points) - teamActual) /
        (Math.abs(Number(optimalTeam.total_predicted_points)) + Math.abs(teamActual) + 2));
      await supabase.from('optimal_teams').update({
        actual_points: teamActual,
        accuracy_percentage: round(Math.max(0, teamScore), 1),
        updated_at: new Date().toISOString(),
      }).eq('id', optimalTeam.id);
    }

    const { error: historyError } = await supabase.from('prediction_history').upsert({
      gameweek_id,
      total_predicted_points: round(totalPredicted),
      total_actual_points: totalActual,
      accuracy_percentage: round(overallScore, 1),
      players_analyzed: scored.length,
      correct_predictions: correctPredictions,
      avg_prediction_error: round(mae, 2),
      rmse: round(rmse, 2),
      within_two_percentage: round(withinTwoPercentage, 1),
      calibration_bias: round(bias, 2),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'gameweek_id' });
    if (historyError) throw historyError;

    return json({
      success: true,
      updated_predictions: scored.length,
      accuracy_percentage: round(overallScore, 1),
      correct_predictions: correctPredictions,
      within_two_percentage: round(withinTwoPercentage, 1),
      avg_prediction_error: round(mae, 2),
      rmse: round(rmse, 2),
      calibration_bias: round(bias, 2),
    });
  } catch (error) {
    console.error('Updating results failed:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
