import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  Search, 
  Trophy, 
  TrendingUp, 
  TrendingDown,
  ArrowUpDown,
  Loader2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayers } from "@/hooks/useFPLData";
import { useUserTeam } from "@/hooks/useUserTeam";

interface RivalTeam {
  entry: number;
  entry_name: string;
  player_name: string;
  rank: number;
  last_rank: number;
  total: number;
  event_total: number;
  picks?: number[];
}

interface LeagueData {
  league: {
    id: number;
    name: string;
  };
  standings: {
    results: RivalTeam[];
  };
}

export function MiniLeagueRivals({ className }: { className?: string }) {
  const [leagueId, setLeagueId] = useState("");
  const [leagueData, setLeagueData] = useState<LeagueData | null>(null);
  const { data: players } = usePlayers();
  const { data: userTeam } = useUserTeam();

  const fetchLeagueMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('fetch-mini-league', {
        body: { league_id: parseInt(id) }
      });
      if (error) throw error;
      return data as LeagueData;
    },
    onSuccess: (data) => {
      setLeagueData(data);
    },
  });

  const handleFetch = () => {
    if (leagueId.trim()) {
      fetchLeagueMutation.mutate(leagueId);
    }
  };

  // Calculate differentials - players in rival teams but not in user's team
  const getDifferentials = () => {
    if (!leagueData || !userTeam || !players) return [];

    const userPlayerIds = new Set(userTeam.player_ids || []);
    const rivalPicks: Map<number, number> = new Map(); // playerId -> count

    leagueData.standings.results.forEach(rival => {
      if (rival.picks && rival.entry !== userTeam.fpl_team_id) {
        rival.picks.forEach(playerId => {
          if (!userPlayerIds.has(playerId)) {
            rivalPicks.set(playerId, (rivalPicks.get(playerId) || 0) + 1);
          }
        });
      }
    });

    // Sort by frequency
    const sortedDiffs = Array.from(rivalPicks.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return sortedDiffs.map(([playerId, count]) => {
      const player = players.find(p => p.fpl_id === playerId || p.id === playerId);
      return { player, count };
    }).filter(d => d.player);
  };

  const differentials = getDifferentials();

  return (
    <Card className={cn("glass border-border/30", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-primary" />
          Mini-League Rivals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* League ID Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter Mini-League ID..."
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            className="flex-1"
            type="number"
          />
          <Button 
            onClick={handleFetch}
            disabled={fetchLeagueMutation.isPending || !leagueId.trim()}
            className="gap-2"
          >
            {fetchLeagueMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Fetch
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Find your league ID in the URL when viewing your mini-league on the FPL website.
        </p>

        {/* Error State */}
        {fetchLeagueMutation.isError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Failed to fetch league data. Please check the ID and try again.</span>
          </div>
        )}

        {/* Loading State */}
        {fetchLeagueMutation.isPending && (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {/* League Data */}
        {leagueData && !fetchLeagueMutation.isPending && (
          <div className="space-y-4">
            {/* League Header */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="font-medium">{leagueData.league.name}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {leagueData.standings.results.length} managers
              </p>
            </div>

            {/* Standings */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4" />
                Standings
              </h4>
              <ScrollArea className="h-48">
                <div className="space-y-1">
                  {leagueData.standings.results.slice(0, 20).map((rival) => {
                    const rankChange = rival.last_rank - rival.rank;
                    const isUserTeam = userTeam && rival.entry === userTeam.fpl_team_id;
                    
                    return (
                      <div 
                        key={rival.entry}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg text-sm",
                          isUserTeam ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 text-center font-mono text-muted-foreground">
                            {rival.rank}
                          </span>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {rival.entry_name}
                              {isUserTeam && (
                                <Badge variant="outline" className="text-xs">You</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {rival.player_name}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {rankChange !== 0 && (
                            <span className={cn(
                              "flex items-center gap-1 text-xs",
                              rankChange > 0 ? "text-emerald-500" : "text-red-500"
                            )}>
                              {rankChange > 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              {Math.abs(rankChange)}
                            </span>
                          )}
                          <div className="text-right">
                            <div className="font-mono font-medium">{rival.total}</div>
                            <div className="text-xs text-muted-foreground">
                              GW: {rival.event_total}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Differentials */}
            {differentials.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Rival Differentials
                </h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Popular players your rivals have that you don't
                </p>
                <div className="flex flex-wrap gap-2">
                  {differentials.map(({ player, count }) => (
                    <Badge 
                      key={player!.id} 
                      variant="secondary"
                      className="gap-1"
                    >
                      {player!.web_name}
                      <span className="text-xs opacity-70">({count})</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state when no league loaded */}
        {!leagueData && !fetchLeagueMutation.isPending && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Enter your mini-league ID to compare with rivals</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
