import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { league_id } = await req.json();

    if (!league_id || typeof league_id !== 'number') {
      return new Response(JSON.stringify({ error: 'Invalid league_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Fetching mini-league ${league_id}...`);

    // Fetch league standings
    const leagueRes = await fetch(`${FPL_API_BASE}/leagues-classic/${league_id}/standings/`);
    
    if (!leagueRes.ok) {
      if (leagueRes.status === 404) {
        return new Response(JSON.stringify({ error: 'League not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`FPL API error: ${leagueRes.status}`);
    }

    const leagueData = await leagueRes.json();

    // Fetch picks for top managers (limited to avoid rate limiting)
    const topManagers = leagueData.standings.results.slice(0, 10);
    const managersWithPicks = await Promise.all(
      topManagers.map(async (manager: any) => {
        try {
          // Get current gameweek
          const bootstrapRes = await fetch(`${FPL_API_BASE}/bootstrap-static/`);
          const bootstrap = await bootstrapRes.json();
          const currentGW = bootstrap.events.find((e: any) => e.is_current)?.id || 1;

          // Fetch manager's picks
          const picksRes = await fetch(`${FPL_API_BASE}/entry/${manager.entry}/event/${currentGW}/picks/`);
          if (picksRes.ok) {
            const picksData = await picksRes.json();
            return {
              ...manager,
              picks: picksData.picks.map((p: any) => p.element),
            };
          }
        } catch (e) {
          console.error(`Failed to fetch picks for ${manager.entry}:`, e);
        }
        return manager;
      })
    );

    // Update results with picks
    leagueData.standings.results = [
      ...managersWithPicks,
      ...leagueData.standings.results.slice(10),
    ];

    return new Response(JSON.stringify(leagueData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-mini-league:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
