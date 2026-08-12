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
    <div className="min-h-screen bg-background">
      <OnboardingTutorial />

      <header className="border-b border-border/60 bg-card/90 backdrop-blur-xl">
        <div className="container flex min-h-16 items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-lg font-bold leading-5">FPL Edge</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Decision workspace</p>
            </div>
          </div>

          <div className="hidden min-w-[240px] md:block">
            {loadingGameweeks ? <Skeleton className="h-10 w-full" /> : gameweeks?.length ? (
              <GameweekSelector gameweeks={gameweeks} selectedId={selectedGameweekId} onSelect={setSelectedGameweekId} />
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border/50 bg-[linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/0.55))]">
          <div className="pointer-events-none absolute -right-32 -top-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="container relative py-7 md:py-9">
            <div className="mb-5 md:hidden">
              {loadingGameweeks ? <Skeleton className="h-11 w-full" /> : gameweeks?.length ? (
                <GameweekSelector gameweeks={gameweeks} selectedId={selectedGameweekId} onSelect={setSelectedGameweekId} />
              ) : null}
            </div>

            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="gap-1.5 border-primary/25 bg-primary/10 text-primary"><BrainCircuit className="h-3.5 w-3.5" /> {modelVersion}</Badge>
                  <Badge variant="outline" className="gap-1.5"><Clock3 className="h-3.5 w-3.5" /> {deadlineLabel}</Badge>
                </div>
                <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{currentItem.label}</h1>
                <p className="mt-2 text-muted-foreground">{currentItem.description}. Explainable projections built for real gameweek decisions.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => fetchFPLData.mutate()} disabled={fetchFPLData.isPending} className="gap-2 bg-card">
                  <Database className={fetchFPLData.isPending ? 'h-4 w-4 animate-pulse' : 'h-4 w-4'} />
                  {fetchFPLData.isPending ? 'Syncing data' : 'Sync FPL data'}
                </Button>
                <Button onClick={() => calculate(false)} disabled={!selectedGameweekId || isBusy} className="gap-2 shadow-sm">
                  <Sparkles className={isBusy ? 'h-4 w-4 animate-pulse' : 'h-4 w-4'} />
                  {isBusy ? 'Calculating' : predictions?.length ? 'Recalculate' : 'Generate projections'}
                </Button>
                {predictions?.length ? (
                  <Button variant="ghost" size="icon" onClick={() => calculate(true)} disabled={generatePredictions.isPending} title="Ignore cache and rebuild"><RotateCcw className="h-4 w-4" /></Button>
                ) : null}
              </div>
            </div>

            {(isProcessing || predictionStatus?.status === 'failed') && (
              <div className="mt-5 max-w-2xl rounded-xl border border-border/60 bg-card/80 p-3 shadow-sm">
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

        <section className="container py-6">
          {gameweeks?.length ? (
            <>
              <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric icon={Trophy} label="Projected XI" value={optimalTeam ? `${Number(optimalTeam.total_predicted_points).toFixed(1)} pts` : '—'} detail={optimalTeam ? `${optimalTeam.formation} · captain included` : 'Generate this gameweek'} />
                <Metric icon={Target} label="Team rating" value={optimalTeam ? `${optimalTeam.team_rating}/100` : '—'} detail="Budget and confidence adjusted" />
                <Metric icon={BarChart3} label="Last model score" value={lastScored?.accuracy_percentage != null ? `${Number(lastScored.accuracy_percentage).toFixed(1)}%` : '—'} detail={lastScored?.avg_prediction_error != null ? `${Number(lastScored.avg_prediction_error).toFixed(2)} MAE` : 'Score after a completed GW'} />
                <Metric icon={latestSync ? CheckCircle2 : Activity} label="Data freshness" value={latestSync ? formatTimeSince(latestSync) : 'Not synced'} detail={predictionStatus?.completed_at ? `Model ${formatTimeSince(predictionStatus.completed_at)}` : 'Sync before the deadline'} />
              </div>

              <div className="grid gap-5 lg:grid-cols-[240px,minmax(0,1fr)]">
                <WorkspaceNavigation active={activeView} onChange={changeView} />
                <section className="min-w-0">
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
        <div className="container flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>FPL Edge · Explainable fantasy decision support</span>
          <span>Official FPL data · Projections are probabilistic, not guarantees</span>
        </div>
      </footer>
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
    <Card className="border-border/60 bg-card shadow-sm">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 font-display text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{detail}</p></div>
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="h-4 w-4" /></div>
      </CardContent>
    </Card>
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
