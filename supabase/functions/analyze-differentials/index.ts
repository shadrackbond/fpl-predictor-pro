import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { gameweek_id } = await req.json();

    if (!gameweek_id) {
      throw new Error('gameweek_id is required');
    }

    console.log(`Analyzing differentials for gameweek ${gameweek_id}...`);

    // Get players with predictions and hype data
    const { data: predictions } = await supabase
      .from('player_predictions')
      .select(`
        player_id,
        predicted_points,
        fixture_difficulty,
        player:players(
          id,
          web_name,
          first_name,
          second_name,
          position,
          price,
          form,
          selected_by_percent,
          status,
          team_id,
          teams(name, short_name)
        )
      `)
      .eq('gameweek_id', gameweek_id)
      .order('predicted_points', { ascending: false });

    const { data: hypeData } = await supabase
      .from('player_hype')
      .select('*')
      .eq('gameweek_id', gameweek_id);

    const hypeMap = new Map(hypeData?.map(h => [h.player_id, h]) || []);

    // Clear old alerts for this gameweek
    await supabase
      .from('differential_alerts')
      .delete()
      .eq('gameweek_id', gameweek_id);

    const differentials: any[] = [];

    // Analyze each player for differential potential - only active (available) players
    for (const pred of (predictions || [])) {
      const player = pred.player as any;
      // Only consider active/available players (status 'a')
      if (!player || player.status !== 'a') continue;

      const hype = hypeMap.get(pred.player_id);
      const ownership = player.selected_by_percent || 0;
      const predictedPoints = pred.predicted_points || 0;
      const form = parseFloat(player.form) || 0;
      const price = parseFloat(player.price) || 0;
      const fixtureDifficulty = pred.fixture_difficulty || 3;

      // Calculate differential score
      const valuePer100k = ownership > 0 ? predictedPoints / (ownership / 10) : predictedPoints * 10;
      const hyped = hype?.hype_score || 0;
      const sentiment = hype?.sentiment;

      // RISING STAR: Low ownership + good predicted points + positive hype
      if (ownership < 10 && predictedPoints >= 5 && (hyped > 30 || sentiment === 'positive')) {
        differentials.push({
          player_id: pred.player_id,
          gameweek_id,
          alert_type: 'rising_star',
          reason: `${player.web_name} is gaining attention with only ${ownership.toFixed(1)}% ownership. ${hype?.mentions || 0} recent mentions in FPL news. Predicted ${predictedPoints.toFixed(1)} points.`,
          confidence: Math.min(95, 60 + hyped / 2),
          ownership_percent: ownership,
          predicted_points: predictedPoints,
        });
      }

      // VALUE PICK: High points per million + low ownership
      if (ownership < 15 && predictedPoints >= 4 && valuePer100k > 2) {
        differentials.push({
          player_id: pred.player_id,
          gameweek_id,
          alert_type: 'value_pick',
          reason: `${player.web_name} at £${price.toFixed(1)}m offers excellent value. Predicted ${predictedPoints.toFixed(1)} points with only ${ownership.toFixed(1)}% ownership.`,
          confidence: Math.min(90, 50 + valuePer100k * 10),
          ownership_percent: ownership,
          predicted_points: predictedPoints,
        });
      }

      // FORM SURGE: Good form + improving fixtures
      if (form >= 5 && fixtureDifficulty <= 2 && ownership < 20) {
        differentials.push({
          player_id: pred.player_id,
          gameweek_id,
          alert_type: 'form_surge',
          reason: `${player.web_name} is in excellent form (${form.toFixed(1)}) with a favorable fixture (FDR ${fixtureDifficulty}). Currently at ${ownership.toFixed(1)}% ownership.`,
          confidence: Math.min(85, 55 + form * 5),
          ownership_percent: ownership,
          predicted_points: predictedPoints,
        });
      }

      // FIXTURE SWING: Easy fixtures ahead
      if (fixtureDifficulty === 1 && predictedPoints >= 4 && ownership < 25) {
        differentials.push({
          player_id: pred.player_id,
          gameweek_id,
          alert_type: 'fixture_swing',
          reason: `${player.web_name} faces the easiest fixture rating this week. Great differential at ${ownership.toFixed(1)}% ownership.`,
          confidence: 70,
          ownership_percent: ownership,
          predicted_points: predictedPoints,
        });
      }

      // INJURY DOUBT: Negative sentiment in news
      if (sentiment === 'negative' && hyped > 20) {
        differentials.push({
          player_id: pred.player_id,
          gameweek_id,
          alert_type: 'injury_doubt',
          reason: `${player.web_name} has concerning news coverage. Monitor closely before deadline.`,
          confidence: Math.min(80, 40 + hyped / 2),
          ownership_percent: ownership,
          predicted_points: predictedPoints,
        });
      }
    }

    // Deduplicate by player, keeping highest confidence alert per type
    const uniqueAlerts = new Map<string, any>();
    for (const diff of differentials) {
      const key = `${diff.player_id}-${diff.alert_type}`;
      if (!uniqueAlerts.has(key) || uniqueAlerts.get(key).confidence < diff.confidence) {
        uniqueAlerts.set(key, diff);
      }
    }

    const alertsToInsert = Array.from(uniqueAlerts.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 30); // Keep top 30 alerts

    // Insert differential alerts
    if (alertsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('differential_alerts')
        .insert(alertsToInsert);

      if (insertError) {
        console.error('Error inserting alerts:', insertError);
      }
    }

    console.log(`Generated ${alertsToInsert.length} differential alerts`);

    return new Response(JSON.stringify({
      success: true,
      alerts_generated: alertsToInsert.length,
      differentials: alertsToInsert.slice(0, 10), // Return top 10 in response
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-differentials:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
