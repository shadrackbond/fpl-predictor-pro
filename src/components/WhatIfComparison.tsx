import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  GitCompare,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Trophy,
  Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useGameweeks } from '@/hooks/useFPLData';

interface TransferScenario {
  id: string;
  name: string;
  transfers: { out: number; outName: string; in: number; inName: string }[];
  projectedPoints: number[];
  totalPoints: number;
  isLoading?: boolean;
}

interface WhatIfComparisonProps {
  userTeamId?: number;
  currentPlayers: any[];
  currentGameweekId: number | null;
  className?: string;
}

export function WhatIfComparison({
  userTeamId,
  currentPlayers,
  currentGameweekId,
  className,
}: WhatIfComparisonProps) {
  const [scenarios, setScenarios] = useState<TransferScenario[]>([]);
  const [gameweeksToProject, setGameweeksToProject] = useState(6);
  const { data: gameweeks } = useGameweeks();

  // Get upcoming gameweeks
  const upcomingGameweeks = useMemo(() => {
    if (!gameweeks || !currentGameweekId) return [];
    const currentIdx = gameweeks.findIndex(gw => gw.id === currentGameweekId);
    return gameweeks.slice(currentIdx, currentIdx + gameweeksToProject);
  }, [gameweeks, currentGameweekId, gameweeksToProject]);

  // Calculate baseline scenario (current team)
  const baselineQuery = useQuery({
    queryKey: ['what-if-baseline', currentGameweekId, currentPlayers.map(p => p.id)],
    queryFn: async () => {
      if (!currentGameweekId || !currentPlayers.length) return null;
      
      // Get predictions for next 6 gameweeks
      const playerIds = currentPlayers.map(p => p.id);
      const gwIds = upcomingGameweeks.map(gw => gw.id);
      
      const { data: predictions } = await supabase
        .from('player_predictions')
        .select('player_id, gameweek_id, predicted_points')
        .in('player_id', playerIds)
        .in('gameweek_id', gwIds);
      
      if (!predictions) return null;

      // Calculate points per gameweek
      const pointsByGw: Record<number, number> = {};
      predictions.forEach(pred => {
        if (!pointsByGw[pred.gameweek_id]) pointsByGw[pred.gameweek_id] = 0;
        // Only count starting XI (first 11 players sorted by predicted points)
        pointsByGw[pred.gameweek_id] += pred.predicted_points || 0;
      });

      const projectedPoints = gwIds.map(gwId => pointsByGw[gwId] || 0);
      const totalPoints = projectedPoints.reduce((sum, pts) => sum + pts, 0);

      return {
        projectedPoints,
        totalPoints,
      };
    },
    enabled: !!currentGameweekId && currentPlayers.length > 0,
  });

  // Mutation to simulate a transfer scenario
  const simulateMutation = useMutation({
    mutationFn: async ({ scenarioId, transfers }: { scenarioId: string; transfers: any[] }) => {
      const { data, error } = await supabase.functions.invoke('simulate-transfers', {
        body: {
          current_player_ids: currentPlayers.map(p => p.id),
          transfers: transfers.map(t => ({ player_out_id: t.out, player_in_id: t.in })),
          gameweek_ids: upcomingGameweeks.map(gw => gw.id),
        },
      });

      if (error) throw error;
      return { scenarioId, ...data };
    },
    onSuccess: (data) => {
      setScenarios(prev => prev.map(s => 
        s.id === data.scenarioId
          ? { ...s, projectedPoints: data.projectedPoints, totalPoints: data.totalPoints, isLoading: false }
          : s
      ));
    },
    onError: (error, variables) => {
      console.error('Simulation error:', error);
      setScenarios(prev => prev.map(s =>
        s.id === variables.scenarioId
          ? { ...s, isLoading: false }
          : s
      ));
    },
  });

  const addScenario = () => {
    const newScenario: TransferScenario = {
      id: Date.now().toString(),
      name: `Scenario ${scenarios.length + 1}`,
      transfers: [],
      projectedPoints: [],
      totalPoints: 0,
    };
    setScenarios(prev => [...prev, newScenario]);
  };

  const removeScenario = (id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
  };

  const updateScenarioName = (id: string, name: string) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  };

  // Simplified - in real implementation this would use PlayerSearchModal
  const addTransferToScenario = (scenarioId: string, transfer: { out: number; outName: string; in: number; inName: string }) => {
    setScenarios(prev => prev.map(s =>
      s.id === scenarioId
        ? { ...s, transfers: [...s.transfers, transfer] }
        : s
    ));
  };

  const removeTransferFromScenario = (scenarioId: string, transferIdx: number) => {
    setScenarios(prev => prev.map(s =>
      s.id === scenarioId
        ? { ...s, transfers: s.transfers.filter((_, i) => i !== transferIdx) }
        : s
    ));
  };

  const simulateScenario = (scenario: TransferScenario) => {
    if (scenario.transfers.length === 0) return;
    
    setScenarios(prev => prev.map(s =>
      s.id === scenario.id ? { ...s, isLoading: true } : s
    ));

    simulateMutation.mutate({
      scenarioId: scenario.id,
      transfers: scenario.transfers,
    });
  };

  const baselineTotal = baselineQuery.data?.totalPoints || 0;

  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-primary" />
            What-If Comparison
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Project over</span>
            <select
              value={gameweeksToProject}
              onChange={(e) => setGameweeksToProject(Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              {[3, 4, 5, 6, 8, 10].map(n => (
                <option key={n} value={n}>{n} GWs</option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={addScenario} className="gap-1">
              <Plus className="w-4 h-4" />
              Add Scenario
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Baseline (Current Team) */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="font-medium">Current Team (Baseline)</span>
            </div>
            <Badge variant="secondary" className="font-mono">
              {baselineQuery.isLoading ? '...' : `${baselineTotal.toFixed(0)} pts`}
            </Badge>
          </div>
          
          {baselineQuery.data && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {upcomingGameweeks.map((gw, i) => (
                <div key={gw.id} className="flex-shrink-0 text-center">
                  <div className="text-xs text-muted-foreground mb-1">GW{gw.fpl_id}</div>
                  <div className="font-mono text-sm">
                    {baselineQuery.data.projectedPoints[i]?.toFixed(0) || '-'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scenarios */}
        {scenarios.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calculator className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Add a scenario to compare different transfer strategies</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-4">
              {scenarios.map(scenario => {
                const pointsDiff = scenario.totalPoints - baselineTotal;
                const isPositive = pointsDiff > 0;
                
                return (
                  <div
                    key={scenario.id}
                    className="p-4 rounded-lg border border-border bg-card/50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Input
                        value={scenario.name}
                        onChange={(e) => updateScenarioName(scenario.id, e.target.value)}
                        className="h-8 w-40 font-medium"
                      />
                      <div className="flex items-center gap-2">
                        {scenario.totalPoints > 0 && (
                          <Badge
                            variant={isPositive ? 'default' : 'destructive'}
                            className={cn(
                              "font-mono",
                              isPositive && "bg-emerald-500"
                            )}
                          >
                            {isPositive ? '+' : ''}{pointsDiff.toFixed(0)} pts
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeScenario(scenario.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Transfers */}
                    <div className="space-y-2 mb-3">
                      {scenario.transfers.map((t, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="text-red-400">{t.outName}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className="text-emerald-400">{t.inName}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-auto"
                            onClick={() => removeTransferFromScenario(scenario.id, i)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-7"
                        disabled
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Transfer (use Team Simulator)
                      </Button>
                    </div>

                    {/* Projected Points */}
                    {scenario.projectedPoints.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 border-t border-border/50 pt-3">
                        {upcomingGameweeks.map((gw, i) => {
                          const baseline = baselineQuery.data?.projectedPoints[i] || 0;
                          const current = scenario.projectedPoints[i] || 0;
                          const diff = current - baseline;
                          
                          return (
                            <div key={gw.id} className="flex-shrink-0 text-center">
                              <div className="text-xs text-muted-foreground mb-1">GW{gw.fpl_id}</div>
                              <div className="font-mono text-sm">{current.toFixed(0)}</div>
                              {diff !== 0 && (
                                <div className={cn(
                                  "text-xs",
                                  diff > 0 ? "text-emerald-500" : "text-red-500"
                                )}>
                                  {diff > 0 ? '+' : ''}{diff.toFixed(0)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Simulate Button */}
                    {scenario.transfers.length > 0 && scenario.projectedPoints.length === 0 && (
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={() => simulateScenario(scenario)}
                        disabled={scenario.isLoading}
                      >
                        {scenario.isLoading ? 'Calculating...' : 'Calculate Projections'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Summary */}
        {scenarios.length > 0 && scenarios.some(s => s.totalPoints > 0) && (
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
            <div className="flex items-center gap-2 text-sm">
              {(() => {
                const bestScenario = [...scenarios, { name: 'Current', totalPoints: baselineTotal }]
                  .reduce((best, s) => s.totalPoints > best.totalPoints ? s : best);
                
                return (
                  <>
                    <TrendingUp className="w-4 h-4 text-accent" />
                    <span>
                      Best option: <strong>{bestScenario.name}</strong> 
                      {' '}({bestScenario.totalPoints.toFixed(0)} pts over {gameweeksToProject} GWs)
                    </span>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
