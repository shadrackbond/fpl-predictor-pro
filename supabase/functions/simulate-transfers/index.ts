import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const playerId = z.number().int().positive().max(1_000_000);

const requestSchema = z.object({
  current_player_ids: z.array(playerId).min(1).max(15),
  transfers: z.array(z.object({
    player_out_id: playerId,
    player_in_id: playerId,
  })).max(15).default([]),
  gameweek_ids: z.array(z.number().int().positive().max(100)).min(1).max(10),
});

const expectedSquadCounts: Record<string, number> = {
  GKP: 2,
  DEF: 5,
  MID: 5,
  FWD: 3,
};

interface SimulatedPlayer {
  id: number;
  web_name: string;
  position: string;
  team_id: number | null;
  price: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
    }

    const { current_player_ids, transfers, gameweek_ids } = parsed.data;
    const duplicateCurrentIds = duplicates(current_player_ids);
    if (duplicateCurrentIds.length) {
      return json({ error: 'Current squad contains duplicate players', player_ids: duplicateCurrentIds }, 400);
    }

    const simulatedSquad = [...current_player_ids];
    for (const transfer of transfers) {
      const { player_out_id, player_in_id } = transfer;
      if (player_out_id === player_in_id) {
        return json({ error: 'Transfer out and transfer in cannot be the same player', transfer }, 400);
      }

      const outIndex = simulatedSquad.indexOf(player_out_id);
      if (outIndex === -1) {
        return json({ error: 'Cannot transfer out a player who is not in the current squad', player_id: player_out_id }, 400);
      }

      if (simulatedSquad.includes(player_in_id)) {
        return json({ error: 'Cannot transfer in a player who is already in the squad', player_id: player_in_id }, 400);
      }

      simulatedSquad[outIndex] = player_in_id;
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      return json({ error: 'Server misconfiguration' }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, web_name, position, team_id, price')
      .in('id', simulatedSquad);

    if (playersError) throw playersError;

    const simulatedPlayers = (players || []) as SimulatedPlayer[];
    const foundPlayerIds = new Set(simulatedPlayers.map(player => player.id));
    const missingPlayerIds = simulatedSquad.filter(id => !foundPlayerIds.has(id));
    if (missingPlayerIds.length) {
      return json({ error: 'One or more players were not found', player_ids: missingPlayerIds }, 404);
    }

    const validationError = validateFplSquad(simulatedPlayers);
    if (validationError) return json({ error: validationError }, 400);

    const { data: predictions, error: predictionsError } = await supabase
      .from('player_predictions')
      .select('player_id, gameweek_id, predicted_points')
      .in('player_id', simulatedSquad)
      .in('gameweek_id', gameweek_ids);

    if (predictionsError) throw predictionsError;

    const pointsByGameweek = new Map<number, number>();
    for (const gameweekId of gameweek_ids) pointsByGameweek.set(gameweekId, 0);

    for (const prediction of predictions || []) {
      const gameweekId = Number(prediction.gameweek_id);
      pointsByGameweek.set(
        gameweekId,
        (pointsByGameweek.get(gameweekId) || 0) + Number(prediction.predicted_points || 0),
      );
    }

    const projectedPoints = gameweek_ids.map(gameweekId => round(pointsByGameweek.get(gameweekId) || 0));
    const totalPoints = round(projectedPoints.reduce((sum, points) => sum + points, 0));

    return json({
      success: true,
      squad_player_ids: simulatedSquad,
      projectedPoints,
      totalPoints,
      missing_predictions: simulatedSquad.length * gameweek_ids.length - (predictions?.length || 0),
    });
  } catch (error) {
    console.error('Transfer simulation failed:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

function validateFplSquad(players: SimulatedPlayer[]): string | null {
  if (players.length !== 15) return null;

  const positionCounts = new Map<string, number>();
  const teamCounts = new Map<number, number>();

  for (const player of players) {
    positionCounts.set(player.position, (positionCounts.get(player.position) || 0) + 1);
    if (typeof player.team_id === 'number') {
      teamCounts.set(player.team_id, (teamCounts.get(player.team_id) || 0) + 1);
    }
  }

  for (const [position, expectedCount] of Object.entries(expectedSquadCounts)) {
    const actualCount = positionCounts.get(position) || 0;
    if (actualCount !== expectedCount) {
      return `Invalid squad composition: expected ${expectedCount} ${position}, found ${actualCount}.`;
    }
  }

  for (const count of teamCounts.values()) {
    if (count > 3) return 'Invalid squad composition: maximum three players from one club.';
  }

  return null;
}

function duplicates(values: number[]): number[] {
  const seen = new Set<number>();
  const repeated = new Set<number>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
