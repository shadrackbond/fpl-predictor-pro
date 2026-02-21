import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Calendar, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Team {
  id: number;
  name: string;
  short_name: string;
}

interface FixtureWithTeams {
  gameweek_id: number;
  home_team_id: number;
  away_team_id: number;
  home_team_difficulty: number;
  away_team_difficulty: number;
  gameweek: { name: string; fpl_id: number } | null;
}

const difficultyColors: Record<number, string> = {
  1: 'bg-green-500/20 text-green-400 border-green-500/40',
  2: 'bg-lime-500/20 text-lime-400 border-lime-500/40',
  3: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  4: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  5: 'bg-red-500/20 text-red-400 border-red-500/40',
};

const difficultyBg: Record<number, string> = {
  1: 'bg-green-500',
  2: 'bg-lime-500',
  3: 'bg-yellow-500',
  4: 'bg-orange-500',
  5: 'bg-red-500',
};

export function FixtureTicker({ gameweekCount = 6 }: { gameweekCount?: number }) {
  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*');
      if (error) throw error;
      return data as Team[];
    },
  });

  // Fetch upcoming gameweeks
  const { data: gameweeks } = useQuery({
    queryKey: ['upcoming-gameweeks', gameweekCount],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gameweeks')
        .select('id, name, fpl_id, is_next, is_current')
        .order('fpl_id', { ascending: true });
      if (error) throw error;
      
      // Find the next/current gameweek index and return the next N gameweeks
      const nextIdx = data.findIndex((gw) => gw.is_next || gw.is_current);
      const startIdx = nextIdx >= 0 ? nextIdx : 0;
      return data.slice(startIdx, startIdx + gameweekCount);
    },
  });

  // Fetch fixtures for those gameweeks
  const { data: fixtures, isLoading } = useQuery({
    queryKey: ['fixtures-ticker', gameweeks?.map((g) => g.id)],
    queryFn: async () => {
      if (!gameweeks || gameweeks.length === 0) return [];
      const gwIds = gameweeks.map((g) => g.id);
      const { data, error } = await supabase
        .from('fixtures')
        .select('gameweek_id, home_team_id, away_team_id, home_team_difficulty, away_team_difficulty, gameweek:gameweeks(name, fpl_id)')
        .in('gameweek_id', gwIds);
      if (error) throw error;
      return data as FixtureWithTeams[];
    },
    enabled: !!gameweeks && gameweeks.length > 0,
  });

  if (isLoading || !teams || !gameweeks) {
    return (
      <Card className="glass border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-primary" />
            Fixture Difficulty
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Build team -> gameweek -> difficulty map
  const teamFixtures = new Map<number, Map<number, { opponent: string; difficulty: number; isHome: boolean }>>();
  
  teams.forEach((team) => {
    teamFixtures.set(team.id, new Map());
  });

  fixtures?.forEach((fixture) => {
    const homeTeam = teams.find((t) => t.id === fixture.home_team_id);
    const awayTeam = teams.find((t) => t.id === fixture.away_team_id);
    
    if (homeTeam && awayTeam && fixture.gameweek_id) {
      // Home team's perspective
      teamFixtures.get(homeTeam.id)?.set(fixture.gameweek_id, {
        opponent: awayTeam.short_name,
        difficulty: fixture.home_team_difficulty || 3,
        isHome: true,
      });
      
      // Away team's perspective
      teamFixtures.get(awayTeam.id)?.set(fixture.gameweek_id, {
        opponent: homeTeam.short_name,
        difficulty: fixture.away_team_difficulty || 3,
        isHome: false,
      });
    }
  });

  // Sort teams alphabetically
  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Card className="glass border-border/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-primary" />
            Fixture Difficulty (Next {gameweekCount} GWs)
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            {[1, 2, 3, 4, 5].map((d) => (
              <div key={d} className="flex items-center gap-1">
                <div className={cn('w-3 h-3 rounded', difficultyBg[d])} />
                <span className="text-muted-foreground">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-[600px]">
            {/* Header row */}
            <div className="grid grid-cols-[120px_repeat(6,1fr)] gap-1 mb-2">
              <div className="text-xs font-medium text-muted-foreground px-2">Team</div>
              {gameweeks.map((gw) => (
                <div key={gw.id} className="text-xs font-medium text-muted-foreground text-center">
                  {gw.name.replace('Gameweek ', 'GW')}
                </div>
              ))}
            </div>
            
            {/* Team rows */}
            <div className="space-y-1">
              {sortedTeams.map((team) => (
                <div key={team.id} className="grid grid-cols-[120px_repeat(6,1fr)] gap-1 items-center">
                  <div className="text-sm font-medium truncate px-2">{team.short_name}</div>
                  {gameweeks.map((gw) => {
                    const fixture = teamFixtures.get(team.id)?.get(gw.id);
                    if (!fixture) {
                      return (
                        <div key={gw.id} className="h-8 flex items-center justify-center text-xs text-muted-foreground bg-muted/20 rounded">
                          -
                        </div>
                      );
                    }
                    return (
                      <div
                        key={gw.id}
                        className={cn(
                          'h-8 flex items-center justify-center text-xs font-medium rounded border',
                          difficultyColors[fixture.difficulty]
                        )}
                      >
                        <span className={fixture.isHome ? 'uppercase' : 'lowercase'}>
                          {fixture.opponent}
                        </span>
                        {fixture.isHome && <span className="ml-0.5 text-[10px]">(H)</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        
        <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
          <ChevronRight className="w-3 h-3" />
          UPPERCASE = Home, lowercase = Away
        </p>
      </CardContent>
    </Card>
  );
}
