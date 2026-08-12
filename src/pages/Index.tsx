import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { UserMenu } from '@/components/UserMenu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GameweekSelector } from '@/components/GameweekSelector';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';
import { AIAssistant } from '@/components/AIAssistant';
import { WorkspaceNavigation, getWorkspaceItem, type WorkspaceView } from '@/components/WorkspaceNavigation';
import {
  useGameweeks,
  usePredictions,
  useOptimalTeam,
  useFixtures,
  useFetchFPLData,
  useGeneratePredictions,
} from '@/hooks/useFPLData';
import { usePredictionStatus, formatTimeSince } from '@/hooks/usePredictionStatus';
import { usePredictionHistory } from '@/hooks/usePredictionHistory';
import { useUserTeam } from '@/hooks/useUserTeam';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Database,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';

const OptimalTeamView = lazy(() => import('@/components/OptimalTeamView').then(module => ({ default: module.OptimalTeamView })));
const PredictionsTable = lazy(() => import('@/components/PredictionsTable').then(module => ({ default: module.PredictionsTable })));
const FixturesOverview = lazy(() => import('@/components/FixturesOverview').then(module => ({ default: module.FixturesOverview })));
const FixtureTicker = lazy(() => import('@/components/FixtureTicker').then(module => ({ default: module.FixtureTicker })));
const CaptainPicker = lazy(() => import('@/components/CaptainPicker').then(module => ({ default: module.CaptainPicker })));
const MyTeamSection = lazy(() => import('@/components/MyTeamSection').then(module => ({ default: module.MyTeamSection })));
const AccuracyDashboard = lazy(() => import('@/components/AccuracyDashboard').then(module => ({ default: module.AccuracyDashboard })));
const ResultsSection = lazy(() => import('@/components/ResultsSection').then(module => ({ default: module.ResultsSection })));
const DifferentialsDashboard = lazy(() => import('@/components/DifferentialsDashboard').then(module => ({ default: module.DifferentialsDashboard })));
const NewsFeed = lazy(() => import('@/components/NewsFeed').then(module => ({ default: module.NewsFeed })));
const InjuredPlayersSection = lazy(() => import('@/components/InjuredPlayersSection').then(module => ({ default: module.InjuredPlayersSection })));
const PriceWatch = lazy(() => import('@/components/PriceWatch').then(module => ({ default: module.PriceWatch })));
const MiniLeagueRivals = lazy(() => import('@/components/MiniLeagueRivals').then(module => ({ default: module.MiniLeagueRivals })));
const TopPlayersByPosition = lazy(() => import('@/components/TopPlayersByPosition').then(module => ({ default: module.TopPlayersByPosition })));

const validViews = new Set<WorkspaceView>([
  'myteam', 'team', 'captain', 'players', 'differentials', 'topplayers',
  'fixtures', 'fdr', 'injuries', 'prices', 'results', 'accuracy', 'news', 'rivals',
]);

const Index = () => {
  const [selectedGameweekId, setSelectedGameweekId] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryView = searchParams.get('view') as WorkspaceView | null;
  const activeView: WorkspaceView = queryView && validViews.has(queryView) ? queryView : 'myteam';

  const { data: gameweeks, isLoading: loadingGameweeks } = useGameweeks();
  const { data: predictions, isLoading: loadingPredictions } = usePredictions(selectedGameweekId);
  const { data: optimalTeam, isLoading: loadingTeam } = useOptimalTeam(selectedGameweekId);
  const { data: fixtures } = useFixtures(selectedGameweekId);
  const { data: history } = usePredictionHistory();
  const { data: predictionStatus } = usePredictionStatus(selectedGameweekId);
  const { data: userTeam } = useUserTeam();
  const fetchFPLData = useFetchFPLData();
  const generatePredictions = useGeneratePredictions();

  useEffect(() => {
    if (gameweeks?.length && !selectedGameweekId) {
      const next = gameweeks.find(gameweek => gameweek.is_next);
      const current = gameweeks.find(gameweek => gameweek.is_current);
      setSelectedGameweekId(next?.id || current?.id || gameweeks[0].id);
    }
  }, [gameweeks, selectedGameweekId]);

  const selectedGameweek = gameweeks?.find(gameweek => gameweek.id === selectedGameweekId);
  const currentItem = getWorkspaceItem(activeView);
  const isProcessing = predictionStatus?.status === 'processing';
  const isStuck = isProcessing && predictionStatus?.updated_at && Date.now() - new Date(predictionStatus.updated_at).getTime() > 3 * 60 * 1000;
  const projectionProgress = predictionStatus?.total_players
    ? predictionStatus.total_processed / predictionStatus.total_players * 100
    : 0;
  const modelVersion = predictions?.[0]?.model_version || predictionStatus?.model_version || 'ensemble-v2.0';
  const lastScored = history?.[0];
  const latestSync = predictions?.find(prediction => prediction.player?.last_synced_at)?.player?.last_synced_at;
  const isBusy = generatePredictions.isPending || isProcessing;
  const assistantPredictions = useMemo(() => new Map(
    (predictions || [])
      .filter(prediction => typeof prediction.player_id === 'number' && typeof prediction.predicted_points === 'number')
      .map(prediction => [prediction.player_id as number, Number(prediction.predicted_points)]),
  ), [predictions]);

  const deadlineLabel = useMemo(() => {
    if (!selectedGameweek?.deadline_time) return 'Deadline unavailable';
    const deadline = new Date(selectedGameweek.deadline_time);
    if (deadline.getTime() < Date.now()) return `Locked ${format(deadline, 'EEE d MMM, HH:mm')}`;
    return `Deadline ${formatDistanceToNow(deadline, { addSuffix: true })}`;
  }, [selectedGameweek?.deadline_time]);

  const changeView = (view: WorkspaceView) => {
    const params = new URLSearchParams(searchParams);
    params.set('view', view);
    setSearchParams(params);
  };

  const calculate = (force = false) => {
    if (selectedGameweekId) generatePredictions.mutate({ gameweek_id: selectedGameweekId, force_refresh: force });
  };

  return (
    <div className="edge-app">
      <OnboardingTutorial />

      <header className="edge-header">
        <div className="edge-frame flex min-h-[3.15rem] items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-2">
            <div className="edge-brand-mark">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <p className="edge-brand-title">FPL EDGE</p>
              <p className="edge-brand-subtitle">Decision workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden min-w-[155px] md:block">
              {loadingGameweeks ? <Skeleton className="h-8 w-full" /> : gameweeks?.length ? (
                <GameweekSelector gameweeks={gameweeks} selectedId={selectedGameweekId} onSelect={setSelectedGameweekId} />
              ) : null}
            </div>
            <span className="edge-header-date hidden xl:inline">◷ {format(new Date(), 'MMM d · HH:mm')}</span>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main>
        <section className="edge-hero">
          <div className="edge-frame edge-hero-inner">
            <div className="mb-2 w-full md:hidden">
              {loadingGameweeks ? <Skeleton className="h-11 w-full" /> : gameweeks?.length ? (
                <GameweekSelector gameweeks={gameweeks} selectedId={selectedGameweekId} onSelect={setSelectedGameweekId} />
              ) : null}
            </div>

            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="edge-overline gap-1.5 border-white/30 bg-white/5 text-foreground"><BrainCircuit className="h-3 w-3" /> {modelVersion}</Badge>
                <Badge variant="outline" className="edge-overline gap-1.5 border-white/30 bg-white/5 text-foreground"><Clock3 className="h-3 w-3" /> {deadlineLabel}</Badge>
              </div>
              <h1 className="edge-hero-title">{currentItem.label}</h1>
              <p className="edge-hero-copy">{currentItem.description}. Explainable projections built for real gameweek decisions — your squad, laid out the way it lines up on Saturday.</p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 pt-0.5">
              <Button variant="outline" onClick={() => fetchFPLData.mutate()} disabled={fetchFPLData.isPending} className="edge-action gap-2 border-white/30 bg-transparent text-foreground hover:bg-white/10">
                <Database className={fetchFPLData.isPending ? 'h-3.5 w-3.5 animate-pulse' : 'h-3.5 w-3.5'} />
                {fetchFPLData.isPending ? 'Syncing data' : 'Sync FPL data'}
              </Button>
              <Button onClick={() => calculate(false)} disabled={!selectedGameweekId || isBusy} className="edge-action gap-2 bg-[#f0eee4] text-[#102419] hover:bg-white">
                <Sparkles className={isBusy ? 'h-3.5 w-3.5 animate-pulse' : 'h-3.5 w-3.5'} />
                {isBusy ? 'Calculating' : predictions?.length ? 'Recalculate' : 'Generate projections'}
              </Button>
              {predictions?.length ? (
                <Button variant="ghost" size="icon" onClick={() => calculate(true)} disabled={generatePredictions.isPending} title="Ignore cache and rebuild" className="h-8 w-8"><RotateCcw className="h-3.5 w-3.5" /></Button>
              ) : null}
            </div>

            {(isProcessing || predictionStatus?.status === 'failed') && (
              <div className="absolute bottom-2 left-6 max-w-2xl rounded-md border border-border/60 bg-card/90 p-2.5 shadow-sm">
                {isProcessing ? (
                  <div className="flex items-center gap-3">
                    <Progress value={projectionProgress} className="h-2 flex-1" />
                    <span className="whitespace-nowrap font-mono text-xs font-semibold">{predictionStatus.total_processed}/{predictionStatus.total_players}</span>
                    {isStuck && <Button size="sm" variant="destructive" onClick={() => calculate(true)}><AlertCircle className="mr-1 h-3.5 w-3.5" /> Retry</Button>}
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 text-sm text-destructive"><span>{predictionStatus.error_message || 'Projection generation failed.'}</span><Button size="sm" variant="outline" onClick={() => calculate(true)}>Try again</Button></div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="edge-frame edge-main">
          {gameweeks?.length ? (
            <>
              <div className="edge-metrics">
                <Metric icon={Trophy} label="Projected XI" value={optimalTeam ? `${Number(optimalTeam.total_predicted_points).toFixed(1)} pts` : '—'} detail={optimalTeam ? `${optimalTeam.formation} · captain included` : 'Generate this gameweek'} />
                <Metric icon={Target} label="Team rating" value={optimalTeam ? `${optimalTeam.team_rating}/100` : '—'} detail="Budget and confidence adjusted" />
                <Metric icon={BarChart3} label="Last model score" value={lastScored?.accuracy_percentage != null ? `${Number(lastScored.accuracy_percentage).toFixed(1)}%` : '—'} detail={lastScored?.avg_prediction_error != null ? `${Number(lastScored.avg_prediction_error).toFixed(2)} MAE` : 'Score after a completed GW'} />
                <Metric icon={latestSync ? CheckCircle2 : Activity} label="Data freshness" value={latestSync ? formatTimeSince(latestSync) : 'Not synced'} detail={predictionStatus?.completed_at ? `Model ${formatTimeSince(predictionStatus.completed_at)}` : 'Sync before the deadline'} />
              </div>

              <div className="edge-workspace">
                <WorkspaceNavigation active={activeView} onChange={changeView} />
                <section className="edge-content">
                  <Suspense fallback={<WorkspaceSkeleton />}>
                    {renderWorkspace({
                    view: activeView,
                    selectedGameweekId: selectedGameweekId!,
                    gameweeks,
                    predictions: predictions || [],
                    optimalTeam,
                    fixtures: fixtures || [],
                    loadingPredictions,
                    loadingTeam,
                    onGenerate: () => calculate(false),
                    })}
                  </Suspense>
                </section>
              </div>
            </>
          ) : loadingGameweeks ? (
            <div className="space-y-5"><Skeleton className="h-28 w-full" /><Skeleton className="h-[500px] w-full" /></div>
          ) : (
            <EmptyData onSync={() => fetchFPLData.mutate()} loading={fetchFPLData.isPending} />
          )}
        </section>
      </main>

      <footer className="mt-8 border-t border-border/60 bg-card/60 py-6">
        <div className="edge-frame flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>FPL Edge · Explainable fantasy decision support</span>
          <span>Official FPL data · Projections are probabilistic, not guarantees</span>
        </div>
      </footer>

      <AIAssistant
        teamData={userTeam || null}
        gameweekId={selectedGameweekId}
        predictions={assistantPredictions}
      />
    </div>
  );
};

// View components have independent Supabase relation shapes; the router passes their validated query results through unchanged.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderWorkspace({ view, selectedGameweekId, gameweeks, predictions, optimalTeam, fixtures, loadingPredictions, loadingTeam, onGenerate }: any) {
  switch (view as WorkspaceView) {
    case 'myteam': return <MyTeamSection gameweekId={selectedGameweekId} />;
    case 'team': return <OptimalTeamView optimalTeam={optimalTeam || null} predictions={predictions} isLoading={loadingTeam || loadingPredictions} />;
    case 'captain': return <CaptainPicker predictions={predictions} isLoading={loadingPredictions} />;
    case 'players': return predictions.length
      ? <PredictionsTable predictions={predictions} isLoading={loadingPredictions} />
      : <EmptyProjections onGenerate={onGenerate} />;
    case 'differentials': return <DifferentialsDashboard gameweekId={selectedGameweekId} />;
    case 'topplayers': return <TopPlayersByPosition />;
    case 'fixtures': return <div className="mx-auto max-w-4xl"><FixturesOverview fixtures={fixtures} /></div>;
    case 'fdr': return <FixtureTicker gameweekCount={6} />;
    case 'injuries': return <InjuredPlayersSection />;
    case 'prices': return <PriceWatch />;
    case 'results': return <ResultsSection gameweeks={gameweeks} currentGameweekId={selectedGameweekId} />;
    case 'accuracy': return <AccuracyDashboard selectedGameweekId={selectedGameweekId} />;
    case 'news': return <NewsFeed />;
    case 'rivals': return <MiniLeagueRivals />;
    default: return null;
  }
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Trophy; label: string; value: string; detail: string }) {
  return (
    <div className="edge-metric">
      <p className="edge-metric-label"><Icon className="h-2.5 w-2.5" /> {label}</p>
      <p className="edge-metric-value">{value}</p>
      <p className="edge-metric-detail">{detail}</p>
    </div>
  );
}

function EmptyProjections({ onGenerate }: { onGenerate: () => void }) {
  return (
    <Card className="border-dashed border-border bg-card">
      <CardContent className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 rounded-2xl bg-primary/10 p-4 text-primary"><Sparkles className="h-8 w-8" /></div>
        <h2 className="text-xl font-bold">No projections for this gameweek</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Run Ensemble v2 to calculate expected points, ranges, minutes, confidence and risk for every player.</p>
        <Button className="mt-5 gap-2" onClick={onGenerate}>Generate projections <ArrowRight className="h-4 w-4" /></Button>
      </CardContent>
    </Card>
  );
}

function WorkspaceSkeleton() {
  return <div className="space-y-4"><Skeleton className="h-24 w-full rounded-2xl" /><Skeleton className="h-[440px] w-full rounded-2xl" /></div>;
}

function EmptyData({ onSync, loading }: { onSync: () => void; loading: boolean }) {
  return (
    <Card className="border-dashed border-border bg-card">
      <CardContent className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 rounded-2xl bg-primary/10 p-4 text-primary"><Database className="h-8 w-8" /></div>
        <h2 className="text-2xl font-bold">Connect the current FPL season</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Sync the official player, availability, team-strength and fixture data before generating projections.</p>
        <Button size="lg" className="mt-6 gap-2" onClick={onSync} disabled={loading}><RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />{loading ? 'Syncing' : 'Sync FPL data'}</Button>
      </CardContent>
    </Card>
  );
}

export default Index;
