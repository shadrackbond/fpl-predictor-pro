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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { gameweek_id } = await req.json();
    console.log(`Updating actual results for gameweek: ${gameweek_id}`);

    // Get gameweek info
    const { data: gameweek, error: gwError } = await supabase
      .from('gameweeks')
      .select('*')
      .eq('id', gameweek_id)
      .single();

    if (gwError || !gameweek) {
      throw new Error('Gameweek not found');
    }

    // Fetch live data from FPL API
    const liveResponse = await fetch(`https://fantasy.premierleague.com/api/event/${gameweek.fpl_id}/live/`);
    if (!liveResponse.ok) {
      throw new Error(`Failed to fetch live data: ${liveResponse.status}`);
    }
    const liveData = await liveResponse.json();
    console.log(`Fetched live data for ${liveData.elements?.length || 0} players`);

    // Get our players to map fpl_id to our id
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, fpl_id');

    if (playersError) throw playersError;

    const playerMap = new Map(players.map(p => [p.fpl_id, p.id]));

    // Get predictions for this gameweek
    const { data: predictions, error: predError } = await supabase
      .from('player_predictions')
      .select('*')
      .eq('gameweek_id', gameweek_id);

    if (predError) throw predError;

    // Update predictions with actual points
    let updatedCount = 0;
    let totalPredicted = 0;
    let totalActual = 0;
    let correctPredictions = 0;
    let totalError = 0;

    for (const prediction of predictions || []) {
      const player = players.find(p => p.id === prediction.player_id);
      if (!player) continue;

      const livePlayer = liveData.elements.find((e: any) => e.id === player.fpl_id);
      if (!livePlayer) continue;

      const actualPoints = livePlayer.stats.total_points;
      const predictedPoints = prediction.predicted_points;
      const accuracy = predictedPoints > 0 
        ? Math.max(0, 100 - Math.abs(predictedPoints - actualPoints) / predictedPoints * 100)
        : (actualPoints === 0 ? 100 : 0);

      await supabase
        .from('player_predictions')
        .update({
          actual_points: actualPoints,
          prediction_accuracy: accuracy
        })
        .eq('id', prediction.id);

      totalPredicted += predictedPoints;
      totalActual += actualPoints;
      totalError += Math.abs(predictedPoints - actualPoints);
      
      // Consider a prediction "correct" if within 2 points
      if (Math.abs(predictedPoints - actualPoints) <= 2) {
        correctPredictions++;
      }
      updatedCount++;
    }

    console.log(`Updated ${updatedCount} predictions with actual points`);

    // Update optimal team with actual points
    const { data: optimalTeam, error: otError } = await supabase
      .from('optimal_teams')
      .select('*')
      .eq('gameweek_id', gameweek_id)
      .single();

    if (optimalTeam && !otError) {
      // Calculate actual points for optimal team
      let teamActualPoints = 0;
      const startingXI = optimalTeam.starting_xi || [];
      
      for (const playerId of startingXI) {
        const player = players.find(p => p.id === playerId);
        if (!player) continue;
        
        const livePlayer = liveData.elements.find((e: any) => e.id === player.fpl_id);
        if (!livePlayer) continue;
        
        let points = livePlayer.stats.total_points;
        // Double captain points
        if (playerId === optimalTeam.captain_id) {
          points *= 2;
        }
        teamActualPoints += points;
      }

      const teamAccuracy = optimalTeam.total_predicted_points > 0
        ? Math.max(0, 100 - Math.abs(optimalTeam.total_predicted_points - teamActualPoints) / optimalTeam.total_predicted_points * 100)
        : 0;

      await supabase
        .from('optimal_teams')
        .update({
          actual_points: teamActualPoints,
          accuracy_percentage: teamAccuracy,
          updated_at: new Date().toISOString()
        })
        .eq('id', optimalTeam.id);

      console.log(`Updated optimal team: predicted ${optimalTeam.total_predicted_points}, actual ${teamActualPoints}, accuracy ${teamAccuracy.toFixed(1)}%`);
    }

    // Update or create prediction history
    const overallAccuracy = totalPredicted > 0
      ? Math.max(0, 100 - totalError / totalPredicted * 100)
      : 0;
    const avgError = updatedCount > 0 ? totalError / updatedCount : 0;

    const historyData = {
      gameweek_id,
      total_predicted_points: totalPredicted,
      total_actual_points: totalActual,
      accuracy_percentage: overallAccuracy,
      players_analyzed: updatedCount,
      correct_predictions: correctPredictions,
      avg_prediction_error: avgError,
      updated_at: new Date().toISOString()
    };

    await supabase
      .from('prediction_history')
      .upsert(historyData, { onConflict: 'gameweek_id' });

    console.log(`Prediction history updated: accuracy ${overallAccuracy.toFixed(1)}%`);

    return new Response(JSON.stringify({
      success: true,
      updated_predictions: updatedCount,
      accuracy_percentage: overallAccuracy,
      correct_predictions: correctPredictions,
      avg_prediction_error: avgError
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error updating actual results:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
