/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import {
  MODEL_VERSION,
  projectPlayer,
  selectOptimizedSquad,
  selectStartingXI,
  type CalibrationStats,
  type PlayerProjection,
  type ProjectionFixture,
  type ProjectionPlayer,
} from '../_shared/prediction-engine.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  gameweek_id: z.number().int().positive().max(100),
  force_refresh: z.boolean().optional().default(false),
});

const CACHE_HOURS = 4;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  let requestedGameweekId: number | null = null;

  try {
    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
    }

    const { gameweek_id, force_refresh } = parsed.data;
    requestedGameweekId = gameweek_id;

    const { data: existingSync } = await supabase
      .from('prediction_sync_status')
      .select('*')
      .eq('gameweek_id', gameweek_id)
      .maybeSingle();

    if (!force_refresh && existingSync?.status === 'completed' && existingSync.completed_at && existingSync.model_version === MODEL_VERSION) {
      const cacheAge = Date.now() - new Date(existingSync.completed_at).getTime();
      if (cacheAge < CACHE_HOURS * 60 * 60 * 1000) {
        return json({
          success: true,
          cached: true,
          completed_at: existingSync.completed_at,
          predictions_count: existingSync.total_processed,
          model_version: MODEL_VERSION,
        });
      }
    }

    if (!force_refresh && existingSync?.status === 'processing') {
      const age = Date.now() - new Date(existingSync.updated_at || existingSync.started_at).getTime();
      if (age < 3 * 60 * 1000) {
        return json({
          success: true,
          status: 'processing',
          progress: existingSync.total_players > 0
            ? Math.round(existingSync.total_processed / existingSync.total_players * 100)
            : 0,
          model_version: existingSync.model_version || MODEL_VERSION,
        });
      }
    }

    const [{ data: gameweek }, { data: players, error: playersError }, { data: fixtures, error: fixturesError }] = await Promise.all([
      supabase.from('gameweeks').select('*').eq('id', gameweek_id).single(),
      supabase.from('players').select(`
        *,
        teams:team_id (
          id, short_name, strength_attack_home, strength_attack_away,
          strength_defence_home, strength_defence_away
        )
      `),
      supabase.from('fixtures').select(`
        *,
        home_team:home_team_id (
          id, short_name, strength_attack_home, strength_attack_away,
          strength_defence_home, strength_defence_away
        ),
        away_team:away_team_id (
          id, short_name, strength_attack_home, strength_attack_away,
          strength_defence_home, strength_defence_away
        )
      `).eq('gameweek_id', gameweek_id),
    ]);

    if (!gameweek) throw new Error('Gameweek not found');
    if (playersError) throw playersError;
    if (fixturesError) throw fixturesError;
    if (!players?.length) throw new Error('No player data found. Sync FPL data first.');

    await supabase.from('prediction_sync_status').upsert({
      gameweek_id,
      status: 'processing',
      total_players: players.length,
      total_processed: 0,
      last_player_index: 0,
      started_at: new Date().toISOString(),
      completed_at: null,
      error_message: null,
      model_version: MODEL_VERSION,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'gameweek_id' });

    const fixtureMap = createFixtureMap(fixtures || []);
    const calibration = await loadCalibration(supabase, gameweek_id);
    const completedGameweeks = Math.max(1, Number(gameweek.fpl_id) - 1);
    const projections: Array<ProjectionPlayer & PlayerProjection> = [];

    for (const player of players as ProjectionPlayer[]) {
      const playerFixtures = fixtureMap.get(player.team_id) || [];
      const positionCalibration = calibration.get(player.position) || calibration.get('ALL') || { bias: 0, mae: 2.4, samples: 0 };
      projections.push({ ...player, ...projectPlayer(player, playerFixtures, completedGameweeks, positionCalibration) });
    }

    const predictionRows = projections.map(projection => ({
      player_id: projection.player_id,
      gameweek_id,
      predicted_points: projection.predicted_points,
      predicted_floor: projection.predicted_floor,
      predicted_ceiling: projection.predicted_ceiling,
      expected_minutes: projection.expected_minutes,
      confidence: projection.confidence,
      risk_level: projection.risk_level,
      fixture_difficulty: projection.fixture_difficulty,
      fixture_count: projection.fixture_count,
      form_factor: projection.form_factor,
      model_version: projection.model_version,
      prediction_factors: projection.prediction_factors,
      ai_analysis: projection.analysis,
      actual_points: null,
      prediction_accuracy: null,
      updated_at: new Date().toISOString(),
    }));

    for (let index = 0; index < predictionRows.length; index += 150) {
      const batch = predictionRows.slice(index, index + 150);
      const { error } = await supabase
        .from('player_predictions')
        .upsert(batch, { onConflict: 'player_id,gameweek_id' });
      if (error) throw error;

      await supabase.from('prediction_sync_status').update({
        total_processed: Math.min(index + batch.length, predictionRows.length),
        last_player_index: Math.min(index + batch.length, predictionRows.length),
        updated_at: new Date().toISOString(),
      }).eq('gameweek_id', gameweek_id);
    }

    const optimalTeam = await generateOptimalTeam(supabase, gameweek_id, projections);
    await supabase.from('prediction_sync_status').update({
      status: 'completed',
      total_processed: predictionRows.length,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('gameweek_id', gameweek_id);

    return json({
      success: true,
      cached: false,
      predictions_count: predictionRows.length,
      model_version: MODEL_VERSION,
      optimal_team: optimalTeam,
    });
  } catch (error) {
    console.error('Prediction generation failed:', error);
    if (requestedGameweekId) {
      await supabase.from('prediction_sync_status').upsert({
        gameweek_id: requestedGameweekId,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        model_version: MODEL_VERSION,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'gameweek_id' });
    }
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function createFixtureMap(fixtures: any[]): Map<number, ProjectionFixture[]> {
  const map = new Map<number, ProjectionFixture[]>();
  const append = (teamId: number, fixture: ProjectionFixture) => {
    map.set(teamId, [...(map.get(teamId) || []), fixture]);
  };

  for (const fixture of fixtures) {
    append(fixture.home_team_id, {
      opponent: fixture.away_team?.short_name || 'TBD',
      difficulty: fixture.home_team_difficulty || 3,
      isHome: true,
      opponentAttack: fixture.away_team?.strength_attack_away || 1100,
      opponentDefence: fixture.away_team?.strength_defence_away || 1100,
    });
    append(fixture.away_team_id, {
      opponent: fixture.home_team?.short_name || 'TBD',
      difficulty: fixture.away_team_difficulty || 3,
      isHome: false,
      opponentAttack: fixture.home_team?.strength_attack_home || 1100,
      opponentDefence: fixture.home_team?.strength_defence_home || 1100,
    });
  }
  return map;
}

async function loadCalibration(supabase: any, gameweekId: number): Promise<Map<string, CalibrationStats>> {
  const { data, error } = await supabase
    .from('player_predictions')
    .select('predicted_points, actual_points, player:player_id(position)')
    .lt('gameweek_id', gameweekId)
    .not('actual_points', 'is', null)
    .order('gameweek_id', { ascending: false })
    .limit(1000);

  if (error || !data?.length) return new Map();
  const buckets = new Map<string, Array<{ predicted: number; actual: number }>>();
  for (const row of data) {
    const position = Array.isArray(row.player) ? row.player[0]?.position : row.player?.position;
    const observation = { predicted: Number(row.predicted_points), actual: Number(row.actual_points) };
    buckets.set(position || 'ALL', [...(buckets.get(position || 'ALL') || []), observation]);
    buckets.set('ALL', [...(buckets.get('ALL') || []), observation]);
  }

  const result = new Map<string, CalibrationStats>();
  for (const [key, rows] of buckets) {
    const errors = rows.map(row => row.actual - row.predicted);
    result.set(key, {
      bias: errors.reduce((sum, errorValue) => sum + errorValue, 0) / errors.length,
      mae: errors.reduce((sum, errorValue) => sum + Math.abs(errorValue), 0) / errors.length,
      samples: errors.length,
    });
  }
  return result;
}

async function generateOptimalTeam(
  supabase: any,
  gameweekId: number,
  projections: Array<ProjectionPlayer & PlayerProjection>,
) {
  const squad = selectOptimizedSquad(projections);
  if (squad.length !== 15) throw new Error('Could not build a valid 15-player squad within the £100m budget.');

  const starting = selectStartingXI(squad);
  const captainCandidates = [...starting.players].sort((a, b) => {
    const aScore = a.predicted_points * (0.65 + a.confidence / 250) + a.predicted_floor * 0.15;
    const bScore = b.predicted_points * (0.65 + b.confidence / 250) + b.predicted_floor * 0.15;
    return bScore - aScore;
  });
  const captain = captainCandidates[0];
  const viceCaptain = captainCandidates[1];
  const totalPredicted = starting.total + (captain?.predicted_points || 0);
  const averageConfidence = starting.players.reduce((sum, player) => sum + player.confidence, 0) / 11;
  const rating = Math.round(Math.min(98, Math.max(35, 35 + totalPredicted * 0.55 + averageConfidence * 0.25)));
  const squadCost = squad.reduce((sum, player) => sum + player.price, 0);

  const optimalTeam = {
    gameweek_id: gameweekId,
    player_ids: squad.map(player => player.id),
    starting_xi: starting.players.map(player => player.id),
    captain_id: captain?.id,
    vice_captain_id: viceCaptain?.id,
    total_predicted_points: Math.round(totalPredicted * 10) / 10,
    team_rating: rating,
    formation: starting.formation,
    analysis: `${starting.formation} maximizes projected points inside a £${squadCost.toFixed(1)}m valid squad. ${captain?.web_name} is captain based on expected points, floor and confidence; ${viceCaptain?.web_name} is vice-captain. Model: ${MODEL_VERSION}.`,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('optimal_teams').upsert(optimalTeam, { onConflict: 'gameweek_id' });
  if (error) throw error;
  return optimalTeam;
}
