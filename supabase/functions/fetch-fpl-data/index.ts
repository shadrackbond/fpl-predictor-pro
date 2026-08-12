/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const FPL_API_BASE = 'https://fantasy.premierleague.com/api';

serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const syncedAt = new Date().toISOString();
    const [bootstrapResponse, fixtureResponse] = await Promise.all([
      fetch(`${FPL_API_BASE}/bootstrap-static/`),
      fetch(`${FPL_API_BASE}/fixtures/`),
    ]);
    if (!bootstrapResponse.ok) throw new Error(`FPL bootstrap API returned ${bootstrapResponse.status}`);
    if (!fixtureResponse.ok) throw new Error(`FPL fixtures API returned ${fixtureResponse.status}`);

    const [bootstrap, fixtureData] = await Promise.all([bootstrapResponse.json(), fixtureResponse.json()]);
    const teams = bootstrap.teams.map((team: any) => ({
      fpl_id: team.id,
      name: team.name,
      short_name: team.short_name,
      strength_overall: team.strength,
      strength_attack_home: team.strength_attack_home,
      strength_attack_away: team.strength_attack_away,
      strength_defence_home: team.strength_defence_home,
      strength_defence_away: team.strength_defence_away,
      updated_at: syncedAt,
    }));
    const { error: teamError } = await supabase.from('teams').upsert(teams, { onConflict: 'fpl_id' });
    if (teamError) throw teamError;

    const { data: storedTeams, error: storedTeamError } = await supabase.from('teams').select('id, fpl_id');
    if (storedTeamError) throw storedTeamError;
    const teamId = new Map((storedTeams || []).map(team => [team.fpl_id, team.id]));
    const positions: Record<number, string> = { 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' };
    const players = bootstrap.elements.map((player: any) => ({
      fpl_id: player.id,
      first_name: player.first_name,
      second_name: player.second_name,
      web_name: player.web_name,
      team_id: teamId.get(player.team),
      position: positions[player.element_type] || 'MID',
      price: player.now_cost / 10,
      total_points: player.total_points || 0,
      minutes: player.minutes || 0,
      starts: player.starts || 0,
      starts_per_90: number(player.starts_per_90),
      goals_scored: player.goals_scored || 0,
      assists: player.assists || 0,
      clean_sheets: player.clean_sheets || 0,
      goals_conceded: player.goals_conceded || 0,
      saves: player.saves || 0,
      penalties_saved: player.penalties_saved || 0,
      bonus: player.bonus || 0,
      bps: player.bps || 0,
      form: number(player.form),
      points_per_game: number(player.points_per_game),
      ep_next: number(player.ep_next),
      value_form: number(player.value_form),
      value_season: number(player.value_season),
      selected_by_percent: number(player.selected_by_percent),
      transfers_in_event: player.transfers_in_event || 0,
      transfers_out_event: player.transfers_out_event || 0,
      status: player.status,
      chance_of_playing_next_round: player.chance_of_playing_next_round,
      news: player.news || null,
      news_added: player.news_added || null,
      photo: player.photo,
      penalties_order: player.penalties_order || null,
      corners_order: player.corners_and_indirect_freekicks_order || null,
      direct_freekicks_order: player.direct_freekicks_order || null,
      expected_goals: number(player.expected_goals),
      expected_assists: number(player.expected_assists),
      expected_goal_involvement: number(player.expected_goal_involvements),
      expected_goals_per_90: number(player.expected_goals_per_90),
      expected_assists_per_90: number(player.expected_assists_per_90),
      expected_goal_involvements_per_90: number(player.expected_goal_involvements_per_90),
      threat: number(player.threat),
      creativity: number(player.creativity),
      influence: number(player.influence),
      ict_index: number(player.ict_index),
      shots: player.minutes > 0 ? round(number(player.expected_goals) * 4 * player.minutes / 90) : 0,
      shots_in_box: player.minutes > 0 ? round(number(player.expected_goals) * 3 * player.minutes / 90) : 0,
      key_passes: player.minutes > 0 ? round(number(player.expected_assists) * 3 * player.minutes / 90) : 0,
      last_synced_at: syncedAt,
      updated_at: syncedAt,
    }));
    const { error: playerError } = await supabase.from('players').upsert(players, { onConflict: 'fpl_id' });
    if (playerError) throw playerError;

    const gameweeks = bootstrap.events.map((event: any) => ({
      fpl_id: event.id,
      name: event.name,
      deadline_time: event.deadline_time,
      is_current: event.is_current,
      is_next: event.is_next,
      finished: event.finished,
      average_score: event.average_entry_score,
      highest_score: event.highest_score,
      updated_at: syncedAt,
    }));
    const { error: gameweekError } = await supabase.from('gameweeks').upsert(gameweeks, { onConflict: 'fpl_id' });
    if (gameweekError) throw gameweekError;

    const { data: storedGameweeks, error: storedGameweekError } = await supabase.from('gameweeks').select('id, fpl_id');
    if (storedGameweekError) throw storedGameweekError;
    const gameweekId = new Map((storedGameweeks || []).map(gameweek => [gameweek.fpl_id, gameweek.id]));
    const fixtures = fixtureData.filter((fixture: any) => fixture.event).map((fixture: any) => ({
      fpl_id: fixture.id,
      gameweek_id: gameweekId.get(fixture.event),
      home_team_id: teamId.get(fixture.team_h),
      away_team_id: teamId.get(fixture.team_a),
      home_team_difficulty: fixture.team_h_difficulty,
      away_team_difficulty: fixture.team_a_difficulty,
      kickoff_time: fixture.kickoff_time,
      home_score: fixture.team_h_score,
      away_score: fixture.team_a_score,
      finished: fixture.finished,
    }));
    const { error: fixtureError } = await supabase.from('fixtures').upsert(fixtures, { onConflict: 'fpl_id' });
    if (fixtureError) throw fixtureError;

    return json({
      success: true,
      synced_at: syncedAt,
      counts: { teams: teams.length, players: players.length, gameweeks: gameweeks.length, fixtures: fixtures.length },
    });
  } catch (error) {
    console.error('FPL data sync failed:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
