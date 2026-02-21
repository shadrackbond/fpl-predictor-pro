import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Target, Crosshair, TrendingUp, Flame, Zap, Star, Trophy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PlayerWithStats {
  id: number;
  web_name: string;
  position: string;
  price: number;
  total_points: number;
  form: number;
  goals_scored: number;
  assists: number;
  expected_goals: number;
  expected_assists: number;
  expected_goal_involvement: number;
  threat: number;
  creativity: number;
  influence: number;
  ict_index: number;
  shots: number;
  shots_in_box: number;
  key_passes: number;
  minutes: number;
  status: string;
  teams?: {
    short_name: string;
  };
}

type Position = 'GKP' | 'DEF' | 'MID' | 'FWD';
type SortMetric = 'xg' | 'threat' | 'ict' | 'form' | 'points';

const positionLabels: Record<Position, string> = {
  GKP: 'Goalkeepers',
  DEF: 'Defenders',
  MID: 'Midfielders',
  FWD: 'Forwards',
};

const positionStyles: Record<Position, string> = {
  GKP: 'pos-gkp',
  DEF: 'pos-def',
  MID: 'pos-mid',
  FWD: 'pos-fwd',
};

export function TopPlayersByPosition({ className }: { className?: string }) {
  const [selectedPosition, setSelectedPosition] = useState<Position>('FWD');
  const [sortMetric, setSortMetric] = useState<SortMetric>('xg');

  const { data: players, isLoading } = useQuery({
    queryKey: ['top-players-by-position'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select(`
          id,
          web_name,
          position,
          price,
          total_points,
          form,
          goals_scored,
          assists,
          expected_goals,
          expected_assists,
          expected_goal_involvement,
          threat,
          creativity,
          influence,
          ict_index,
          shots,
          shots_in_box,
          key_passes,
          minutes,
          status,
          teams:team_id(short_name)
        `)
        .eq('status', 'a')
        .gt('minutes', 90);

      if (error) throw error;
      return data as unknown as PlayerWithStats[];
    },
  });

  const getPlayersByPosition = (position: Position): PlayerWithStats[] => {
    if (!players) return [];
    
    const filtered = players.filter(p => p.position === position);
    
    // Sort based on selected metric
    return filtered.sort((a, b) => {
      switch (sortMetric) {
        case 'xg':
          return (b.expected_goals || 0) - (a.expected_goals || 0);
        case 'threat':
          return (b.threat || 0) - (a.threat || 0);
        case 'ict':
          return (b.ict_index || 0) - (a.ict_index || 0);
        case 'form':
          return (b.form || 0) - (a.form || 0);
        case 'points':
          return (b.total_points || 0) - (a.total_points || 0);
        default:
          return (b.expected_goals || 0) - (a.expected_goals || 0);
      }
    }).slice(0, 10);
  };

  // Calculate projected season goals (38 GW)
  const getProjectedSeasonGoals = (player: PlayerWithStats): number => {
    if (!player.minutes || player.minutes < 90) return 0;
    const per90xG = (player.expected_goals || 0) / (player.minutes / 90);
    // Assume 30 full 90s for remaining season
    return Math.round(per90xG * 30 * 10) / 10;
  };

  if (isLoading) {
    return (
      <Card className={cn("glass", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            Top 10 by Position
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const topPlayers = getPlayersByPosition(selectedPosition);

  return (
    <Card className={cn("glass", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" />
          Top 10 by Position
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Position Tabs */}
        <Tabs value={selectedPosition} onValueChange={(v) => setSelectedPosition(v as Position)}>
          <TabsList className="grid w-full grid-cols-4">
            {(['GKP', 'DEF', 'MID', 'FWD'] as Position[]).map((pos) => (
              <TabsTrigger key={pos} value={pos} className="text-xs sm:text-sm">
                {pos}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Sort Metric Selector */}
        <div className="flex flex-wrap gap-2">
          <TooltipProvider>
            {[
              { key: 'xg', label: 'xG', icon: Target, tooltip: 'Expected Goals' },
              { key: 'threat', label: 'THR', icon: Crosshair, tooltip: 'Threat Score' },
              { key: 'ict', label: 'ICT', icon: Zap, tooltip: 'ICT Index' },
              { key: 'form', label: 'Form', icon: Flame, tooltip: 'Current Form' },
              { key: 'points', label: 'Pts', icon: Star, tooltip: 'Total Points' },
            ].map((metric) => (
              <Tooltip key={metric.key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setSortMetric(metric.key as SortMetric)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                      sortMetric === metric.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    <metric.icon className="h-3.5 w-3.5" />
                    {metric.label}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sort by {metric.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>

        {/* Players List */}
        <div className="space-y-2">
          {topPlayers.map((player, index) => (
            <div
              key={player.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 transition-colors"
            >
              {/* Rank */}
              <div className={cn(
                "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                index === 0 ? "bg-accent text-accent-foreground" :
                index === 1 ? "bg-muted-foreground/30 text-foreground" :
                index === 2 ? "bg-orange-500/30 text-orange-400" :
                "bg-muted text-muted-foreground"
              )}>
                {index + 1}
              </div>

              {/* Player Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{player.web_name}</span>
                  <Badge variant="outline" className={cn("text-[10px]", positionStyles[player.position as Position])}>
                    {player.teams?.short_name || 'N/A'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>£{player.price?.toFixed(1)}m</span>
                  <span>{player.goals_scored}G {player.assists}A</span>
                  <span className="hidden sm:inline">{player.total_points} pts</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex-shrink-0 text-right">
                <div className="flex items-center gap-3">
                  {/* Primary Stat based on sort */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">
                            {sortMetric === 'xg' && (player.expected_goals?.toFixed(1) || '0.0')}
                            {sortMetric === 'threat' && (player.threat?.toFixed(0) || '0')}
                            {sortMetric === 'ict' && (player.ict_index?.toFixed(1) || '0.0')}
                            {sortMetric === 'form' && (player.form?.toFixed(1) || '0.0')}
                            {sortMetric === 'points' && (player.total_points || 0)}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase">
                            {sortMetric === 'xg' && 'xG'}
                            {sortMetric === 'threat' && 'Threat'}
                            {sortMetric === 'ict' && 'ICT'}
                            {sortMetric === 'form' && 'Form'}
                            {sortMetric === 'points' && 'Pts'}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <div className="space-y-1.5 text-xs">
                          <div className="font-semibold border-b border-border/50 pb-1">
                            {player.web_name} - Advanced Stats
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <span className="text-muted-foreground">xG:</span>
                            <span className="font-medium">{player.expected_goals?.toFixed(2)}</span>
                            <span className="text-muted-foreground">xA:</span>
                            <span className="font-medium">{player.expected_assists?.toFixed(2)}</span>
                            <span className="text-muted-foreground">xGI:</span>
                            <span className="font-medium">{player.expected_goal_involvement?.toFixed(2)}</span>
                            <span className="text-muted-foreground">Shots (est):</span>
                            <span className="font-medium">{player.shots?.toFixed(0)}</span>
                            <span className="text-muted-foreground">In-box (est):</span>
                            <span className="font-medium">{player.shots_in_box?.toFixed(0)}</span>
                            <span className="text-muted-foreground">Key Passes:</span>
                            <span className="font-medium">{player.key_passes?.toFixed(0)}</span>
                            <span className="text-muted-foreground border-t border-border/50 pt-1">Season xG Proj:</span>
                            <span className="font-bold text-primary border-t border-border/50 pt-1">{getProjectedSeasonGoals(player)}</span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Projected Season Goals Badge */}
                  {selectedPosition !== 'GKP' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex flex-col items-center px-2 py-1 rounded bg-accent/10 border border-accent/20">
                            <TrendingUp className="h-3 w-3 text-accent mb-0.5" />
                            <span className="text-sm font-bold text-accent">{getProjectedSeasonGoals(player)}</span>
                            <span className="text-[8px] text-muted-foreground">PROJ</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Projected xG for remaining season</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            </div>
          ))}

          {topPlayers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No players found with sufficient minutes
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground">
            📊 xG = Expected Goals | THR = Threat | ICT = Influence + Creativity + Threat Index | PROJ = Projected season xG based on current rate
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
