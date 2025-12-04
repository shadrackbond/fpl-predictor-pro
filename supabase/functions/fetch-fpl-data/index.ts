import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FPL_API_BASE = 'https://fantasy.premierleague.com/api';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Fetching FPL bootstrap data...');
    
    // Fetch bootstrap-static data
    const bootstrapRes = await fetch(`${FPL_API_BASE}/bootstrap-static/`);
    if (!bootstrapRes.ok) {
      throw new Error(`FPL API error: ${bootstrapRes.status}`);
    }
    const bootstrapData = await bootstrapRes.json();

    // Process teams
    const teams = bootstrapData.teams.map((team: any) => ({
      fpl_id: team.id,
      name: team.name,
      short_name: team.short_name,
      strength_overall: team.strength,
      strength_attack_home: team.strength_attack_home,
      strength_attack_away: team.strength_attack_away,
      strength_defence_home: team.strength_defence_home,
      strength_defence_away: team.strength_defence_away,
    }));

    console.log(`Upserting ${teams.length} teams...`);
    const { error: teamsError } = await supabase
      .from('teams')
      .upsert(teams, { onConflict: 'fpl_id' });
    
    if (teamsError) {
      console.error('Teams upsert error:', teamsError);
      throw teamsError;
    }

    // Get team mapping for players
    const { data: teamsData } = await supabase.from('teams').select('id, fpl_id');
    const teamMap = new Map(teamsData?.map((t: any) => [t.fpl_id, t.id]) || []);

    // Position mapping
    const positionMap: Record<number, string> = {
      1: 'GKP',
      2: 'DEF', 
      3: 'MID',
      4: 'FWD'
    };

    // Process players
    const players = bootstrapData.elements.map((player: any) => ({
      fpl_id: player.id,
      first_name: player.first_name,
      second_name: player.second_name,
      web_name: player.web_name,
      team_id: teamMap.get(player.team),
      position: positionMap[player.element_type] || 'MID',
      price: player.now_cost / 10,
      total_points: player.total_points,
      minutes: player.minutes,
      goals_scored: player.goals_scored,
      assists: player.assists,
      clean_sheets: player.clean_sheets,
      goals_conceded: player.goals_conceded,
      bonus: player.bonus,
      form: parseFloat(player.form) || 0,
      selected_by_percent: parseFloat(player.selected_by_percent) || 0,
      status: player.status,
      photo: player.photo,
    }));

    console.log(`Upserting ${players.length} players...`);
    const { error: playersError } = await supabase
      .from('players')
      .upsert(players, { onConflict: 'fpl_id' });
    
    if (playersError) {
      console.error('Players upsert error:', playersError);
      throw playersError;
    }

    // Process gameweeks
    const gameweeks = bootstrapData.events.map((event: any) => ({
      fpl_id: event.id,
      name: event.name,
      deadline_time: event.deadline_time,
      is_current: event.is_current,
      is_next: event.is_next,
      finished: event.finished,
      average_score: event.average_entry_score,
      highest_score: event.highest_score,
    }));

    console.log(`Upserting ${gameweeks.length} gameweeks...`);
    const { error: gameweeksError } = await supabase
      .from('gameweeks')
      .upsert(gameweeks, { onConflict: 'fpl_id' });
    
    if (gameweeksError) {
      console.error('Gameweeks upsert error:', gameweeksError);
      throw gameweeksError;
    }

    // Fetch fixtures
    console.log('Fetching fixtures...');
    const fixturesRes = await fetch(`${FPL_API_BASE}/fixtures/`);
    const fixturesData = await fixturesRes.json();

    // Get gameweek mapping
    const { data: gweeksData } = await supabase.from('gameweeks').select('id, fpl_id');
    const gwMap = new Map(gweeksData?.map((g: any) => [g.fpl_id, g.id]) || []);

    const fixtures = fixturesData
      .filter((f: any) => f.event) // Only fixtures with gameweek assigned
      .map((fixture: any) => ({
        fpl_id: fixture.id,
        gameweek_id: gwMap.get(fixture.event),
        home_team_id: teamMap.get(fixture.team_h),
        away_team_id: teamMap.get(fixture.team_a),
        home_team_difficulty: fixture.team_h_difficulty,
        away_team_difficulty: fixture.team_a_difficulty,
        kickoff_time: fixture.kickoff_time,
        home_score: fixture.team_h_score,
        away_score: fixture.team_a_score,
        finished: fixture.finished,
      }));

    console.log(`Upserting ${fixtures.length} fixtures...`);
    const { error: fixturesError } = await supabase
      .from('fixtures')
      .upsert(fixtures, { onConflict: 'fpl_id' });
    
    if (fixturesError) {
      console.error('Fixtures upsert error:', fixturesError);
      throw fixturesError;
    }

    return new Response(JSON.stringify({
      success: true,
      counts: {
        teams: teams.length,
        players: players.length,
        gameweeks: gameweeks.length,
        fixtures: fixtures.length,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-fpl-data:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
