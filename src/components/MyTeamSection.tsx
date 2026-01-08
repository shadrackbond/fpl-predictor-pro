import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserTeam, useAnalyzeUserTeam, useDeleteUserTeam } from '@/hooks/useUserTeam';
import { useOptimalTeam, useGameweeks } from '@/hooks/useFPLData';
import { TransferSuggestions } from './TransferSuggestions';
import { ChipAnalysis } from './ChipAnalysis';
import { TeamComparison } from './TeamComparison';
import { TeamSimulator } from './TeamSimulator';
import { GameweekHistoryTable, type GameweekHistoryRow } from './GameweekHistoryTable';
import { ShareTeamButton } from './ShareTeamButton';
import {
  UserCircle,
  Download,
  TrendingUp,
  Trophy,
  Coins,
  ArrowLeftRight,
  Loader2,
  Sparkles,
  Users
} from 'lucide-react';

interface MyTeamSectionProps {
  gameweekId: number | null;
}

type AnyAnalysis = any;

export function MyTeamSection({ gameweekId }: MyTeamSectionProps) {
  const [fplId, setFplId] = useState('');
  const [showOptimized, setShowOptimized] = useState(false);
  const teamContainerRef = useRef<HTMLDivElement>(null);

  const { data: userTeam, isLoading: loadingTeam } = useUserTeam();
  const { data: optimalTeam } = useOptimalTeam(gameweekId);
  const { data: gameweeks } = useGameweeks();

  const analyzeTeam = useAnalyzeUserTeam();
  const deleteTeam = useDeleteUserTeam();

  const [persistedAnalysis, setPersistedAnalysis] = useState<AnyAnalysis | null>(null);

  const analysisCacheKey =
    userTeam?.user_id && userTeam?.fpl_team_id && gameweekId
      ? `myteam-analysis:${userTeam.user_id}:${userTeam.fpl_team_id}:${gameweekId}`
      : null;

  useEffect(() => {
    if (!analysisCacheKey) return;
    try {
      const raw = localStorage.getItem(analysisCacheKey);
      if (raw) setPersistedAnalysis(JSON.parse(raw));
    } catch {
      // ignore cache parse errors
    }
  }, [analysisCacheKey]);

  useEffect(() => {
    if (!analysisCacheKey) return;
    if (!analyzeTeam.data) return;

    setPersistedAnalysis(analyzeTeam.data as AnyAnalysis);
    try {
      localStorage.setItem(analysisCacheKey, JSON.stringify(analyzeTeam.data));
    } catch {
      // ignore quota errors
    }
  }, [analysisCacheKey, analyzeTeam.data]);

  const handleImportTeam = () => {
    const teamId = parseInt(fplId.trim());
    if (isNaN(teamId) || teamId <= 0) {
      return;
    }
    analyzeTeam.mutate({ fpl_team_id: teamId, gameweek_id: gameweekId });
  };

  const handleRefreshAnalysis = () => {
    if (userTeam?.fpl_team_id) {
      analyzeTeam.mutate({ fpl_team_id: userTeam.fpl_team_id, gameweek_id: gameweekId });
    }
  };

  const handleChangeTeam = () => {
    if (userTeam?.id) {
      deleteTeam.mutate(userTeam.id);
    }
  };

  const isAnalyzing = analyzeTeam.isPending || deleteTeam.isPending;

  const analysisData: AnyAnalysis | null = (analyzeTeam.data as AnyAnalysis) ?? persistedAnalysis;
  const hasAnalysis = !!analysisData;

  const teamComparison = useMemo(() => {
    if (!analysisData) return null;

    const playerPreds = (analysisData.player_predictions || {}) as Record<string, unknown>;

    const getPred = (id: number) => {
      const v = (playerPreds[String(id)] ?? (playerPreds as any)[id]);
      return typeof v === 'number' ? v : Number(v ?? 0);
    };

    const startingXI =
      Array.isArray(analysisData.starting_xi) && analysisData.starting_xi.length === 11
        ? (analysisData.starting_xi as number[])
        : null;

    const currentPredicted = startingXI
      ? startingXI.reduce((sum, id) => sum + getPred(id), 0)
      : (typeof analysisData.team_comparison?.current_predicted_points === 'number'
        ? Number(analysisData.team_comparison.current_predicted_points)
        : null);

    const optimalPredicted = typeof optimalTeam?.total_predicted_points === 'number'
      ? Number(optimalTeam.total_predicted_points)
      : (typeof analysisData.team_comparison?.optimal_potential_points === 'number'
        ? Number(analysisData.team_comparison.optimal_potential_points)
        : null);

    if (typeof currentPredicted !== 'number' || typeof optimalPredicted !== 'number') {
      return analysisData.team_comparison ?? null;
    }

    return {
      current_predicted_points: currentPredicted,
      optimal_potential_points: optimalPredicted,
      performance_diff: optimalPredicted - currentPredicted,
    };
  }, [analysisData, optimalTeam]);

  if (loadingTeam) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // No team imported yet
  if (!userTeam) {
    return (
      <Card className="border-dashed border-2 border-border bg-card/50">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 rounded-full gradient-primary mx-auto mb-4 flex items-center justify-center">
            <UserCircle className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Import Your FPL Team</CardTitle>
          <CardDescription className="max-w-md mx-auto">
            Enter your FPL Team ID to analyze your team, get transfer suggestions, and compare against the optimal prediction.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-md mx-auto space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter your FPL Team ID"
              value={fplId}
              onChange={(e) => setFplId(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleImportTeam}
              disabled={isAnalyzing || !fplId.trim()}
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Import
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Find your Team ID in the FPL website URL when viewing your team:
            <br />
            <code className="bg-muted px-1 rounded">fantasy.premierleague.com/entry/<strong>YOUR_ID</strong>/event/...</code>
          </p>
        </CardContent>
      </Card>
    );
  }

  // Team already imported - show analysis

  return (
    <div className="space-y-6">
      {/* Team Header */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                <Trophy className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{userTeam.team_name}</h2>
                <p className="text-muted-foreground">FPL ID: {userTeam.fpl_team_id}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1 py-1.5 px-3">
                <TrendingUp className="w-3.5 h-3.5" />
                Rank: {userTeam.overall_rank?.toLocaleString() || 'N/A'}
              </Badge>
              <Badge variant="secondary" className="gap-1 py-1.5 px-3">
                <Trophy className="w-3.5 h-3.5" />
                Points: {userTeam.overall_points || 0}
              </Badge>
              <Badge variant="secondary" className="gap-1 py-1.5 px-3">
                <Coins className="w-3.5 h-3.5" />
                Bank: £{(userTeam.bank || 0).toFixed(1)}M
              </Badge>
              <Badge variant="outline" className="gap-1 py-1.5 px-3 border-primary text-primary">
                <ArrowLeftRight className="w-3.5 h-3.5" />
                {userTeam.free_transfers || 1} FT
              </Badge>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAnalysis}
              disabled={isAnalyzing}
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4" />
                  Refresh Analysis
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleChangeTeam}
              disabled={isAnalyzing}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Change Team
            </Button>
            <ShareTeamButton
              teamName={userTeam.team_name || 'My FPL Team'}
              points={userTeam.overall_points || undefined}
              rank={userTeam.overall_rank || undefined}
              gameweek={gameweeks?.find(gw => gw.id === gameweekId)?.name}
              containerRef={teamContainerRef}
            />
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {isAnalyzing && !hasAnalysis && (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {/* Analysis results */}
      {hasAnalysis && (
        <>
          {/* Team Comparison */}
          {teamComparison && (
            <TeamComparison comparison={teamComparison} />
          )}

          {/* Transfer Suggestions */}
          <TransferSuggestions
            suggestions={analysisData.transfers || []}
            freeTransfers={userTeam.free_transfers || 1}
            isLoading={isAnalyzing}
          />

          {/* Chip Analysis */}
          <ChipAnalysis
            chips={analysisData.chip_analysis || []}
            chipsAvailable={userTeam.chips_available as string[] || []}
            isLoading={isAnalyzing}
          />

          {/* Gameweek History Table */}
          {Array.isArray(analysisData.gameweek_history) && analysisData.gameweek_history.length > 0 && (
            <GameweekHistoryTable history={analysisData.gameweek_history as GameweekHistoryRow[]} />
          )}

          {/* Team Display Toggle */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Your Team</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={!showOptimized ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowOptimized(false)}
                    className="gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Current
                  </Button>
                  <Button
                    variant={showOptimized ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowOptimized(true)}
                    className="gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Optimization
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Team Simulator with Transfer/Sub capabilities */}
          <div ref={teamContainerRef}>
            <TeamSimulator
              players={analysisData.user_players || []}
              captainId={userTeam.captain_id}
              viceCaptainId={userTeam.vice_captain_id}
              initialStartingXI={analysisData.starting_xi || undefined}
              suggestedLineup={showOptimized ? (analysisData.suggested_lineup || []) : undefined}
              predictions={new Map(Object.entries(analysisData.player_predictions || {}).map(([k, v]) => [parseInt(k), v as number]))}
              showOptimized={showOptimized}
              bank={userTeam.bank || 0}
            />
          </div>
        </>
      )}
    </div>
  );
}
