import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { Activity, Clock, CheckCircle2, Timer, ChevronRight } from 'lucide-react';
import { useAllFixtures } from '@/hooks/useAllFixtures';
import { Skeleton } from '@/components/ui/skeleton';

interface ResultsSectionProps {
  gameweeks: Array<{
    id: number;
    fpl_id: number;
    name: string;
    is_current: boolean;
    is_next: boolean;
    finished: boolean;
  }>;
  currentGameweekId: number | null;
}

export function ResultsSection({ gameweeks, currentGameweekId }: ResultsSectionProps) {
  const [selectedPastGW, setSelectedPastGW] = useState<string>('');
  const { data: allFixtures, isLoading } = useAllFixtures();

  // Find current/live gameweek and past gameweeks
  const currentGW = gameweeks.find(gw => gw.is_current);
  const pastGameweeks = gameweeks.filter(gw => gw.finished).reverse();

  // Get fixtures for current gameweek (live)
  const liveFixtures = allFixtures?.filter(f => f.gameweek_id === currentGW?.id) || [];

  // Get fixtures for selected past gameweek
  const selectedPastGWId = selectedPastGW ? parseInt(selectedPastGW) : pastGameweeks[0]?.id;
  const pastFixtures = allFixtures?.filter(f => f.gameweek_id === selectedPastGWId) || [];

  const getMatchStatus = (fixture: any) => {
    if (fixture.finished) {
      return { label: 'FT', variant: 'default' as const, icon: CheckCircle2 };
    }
    if (fixture.kickoff_time) {
      const kickoff = new Date(fixture.kickoff_time);
      const now = new Date();
      if (kickoff <= now) {
        return { label: 'LIVE', variant: 'destructive' as const, icon: Activity };
      }
    }
    return { label: 'Upcoming', variant: 'secondary' as const, icon: Clock };
  };

  const MatchCard = ({ fixture, showDate = false }: { fixture: any; showDate?: boolean }) => {
    const status = getMatchStatus(fixture);
    const StatusIcon = status.icon;

    return (
      <div className="group relative p-4 rounded-xl bg-card/60 border border-border/40 hover:border-primary/30 hover:bg-card/80 transition-all duration-300">
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <Badge 
            variant={status.variant} 
            className={cn(
              "text-xs font-medium gap-1",
              status.label === 'LIVE' && "animate-pulse bg-red-500 text-white"
            )}
          >
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </Badge>
        </div>

        {/* Date/Time */}
        {showDate && fixture.kickoff_time && (
          <p className="text-xs text-muted-foreground mb-3">
            {format(new Date(fixture.kickoff_time), 'EEE, MMM d • HH:mm')}
          </p>
        )}

        {/* Match Content */}
        <div className="flex items-center justify-between gap-4">
          {/* Home Team */}
          <div className="flex-1 text-right">
            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {fixture.home_team?.name || 'TBD'}
            </p>
            <p className="text-xs text-muted-foreground">
              {fixture.home_team?.short_name || '---'}
            </p>
          </div>

          {/* Score */}
          <div className="px-4 py-2 rounded-lg bg-background/80 border border-border/50 min-w-[80px] text-center">
            {fixture.finished || (fixture.kickoff_time && new Date(fixture.kickoff_time) <= new Date()) ? (
              <p className="text-2xl font-bold font-mono tracking-wider">
                <span className="text-foreground">{fixture.home_score ?? 0}</span>
                <span className="text-muted-foreground mx-1">-</span>
                <span className="text-foreground">{fixture.away_score ?? 0}</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground font-medium">
                {fixture.kickoff_time 
                  ? format(new Date(fixture.kickoff_time), 'HH:mm')
                  : 'TBD'
                }
              </p>
            )}
          </div>

          {/* Away Team */}
          <div className="flex-1 text-left">
            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {fixture.away_team?.name || 'TBD'}
            </p>
            <p className="text-xs text-muted-foreground">
              {fixture.away_team?.short_name || '---'}
            </p>
          </div>
        </div>

        {/* Fixture Difficulty Indicators */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">FDR:</span>
            <Badge variant="outline" className={cn("text-xs", `difficulty-${fixture.home_team_difficulty || 3}`)}>
              {fixture.home_team_difficulty || '?'}
            </Badge>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-xs", `difficulty-${fixture.away_team_difficulty || 3}`)}>
              {fixture.away_team_difficulty || '?'}
            </Badge>
            <span className="text-xs text-muted-foreground">:FDR</span>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="live" className="w-full">
        <TabsList className="bg-card/50 backdrop-blur border border-border/50 p-1.5">
          <TabsTrigger 
            value="live" 
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Activity className="w-4 h-4" />
            Live / Current GW
            {currentGW && (
              <Badge variant="secondary" className="ml-1 text-xs">
                GW{currentGW.fpl_id}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="past" 
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Timer className="w-4 h-4" />
            Past Results
          </TabsTrigger>
        </TabsList>

        {/* Live / Current Gameweek */}
        <TabsContent value="live" className="mt-6">
          <Card className="glass border-border/30">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {currentGW?.name || 'Current Gameweek'}
                  </h3>
                  <p className="text-sm text-muted-foreground font-normal">
                    Live scores and upcoming matches
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {liveFixtures.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {liveFixtures.map((fixture) => (
                    <MatchCard key={fixture.id} fixture={fixture} showDate />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No fixtures for the current gameweek</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Past Results */}
        <TabsContent value="past" className="mt-6">
          <Card className="glass border-border/30">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <CheckCircle2 className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Past Results</h3>
                    <p className="text-sm text-muted-foreground font-normal">
                      Results from previous gameweeks
                    </p>
                  </div>
                </CardTitle>

                <Select
                  value={selectedPastGW || pastGameweeks[0]?.id?.toString()}
                  onValueChange={setSelectedPastGW}
                >
                  <SelectTrigger className="w-[180px] bg-background/50">
                    <SelectValue placeholder="Select gameweek" />
                  </SelectTrigger>
                  <SelectContent>
                    {pastGameweeks.map((gw) => (
                      <SelectItem key={gw.id} value={gw.id.toString()}>
                        {gw.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[600px]">
                {pastFixtures.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {pastFixtures.map((fixture) => (
                      <MatchCard key={fixture.id} fixture={fixture} showDate />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Timer className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No results available for this gameweek</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
