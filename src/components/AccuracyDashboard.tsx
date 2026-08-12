import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, CheckCircle2, RefreshCw, Scale, Target, TrendingUp, Trophy } from 'lucide-react';
import { useModelPerformance, useScoreGameweek, useScoredOptimalTeams } from '@/hooks/useModelPerformance';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function AccuracyDashboard({ selectedGameweekId }: { selectedGameweekId: number | null }) {
  const { data: history, isLoading } = useModelPerformance();
  const { data: optimalTeams } = useScoredOptimalTeams();
  const updateResults = useScoreGameweek();

  if (isLoading) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32" />)}</div>;

  const totalPredictions = history?.reduce((sum, row) => sum + (row.players_analyzed || 0), 0) || 0;
  const totalCorrect = history?.reduce((sum, row) => sum + (row.correct_predictions || 0), 0) || 0;
  const weightedScore = totalPredictions
    ? (history || []).reduce((sum, row) => sum + Number(row.accuracy_percentage || 0) * row.players_analyzed, 0) / totalPredictions
    : 0;
  const weightedMae = totalPredictions
    ? (history || []).reduce((sum, row) => sum + Number(row.avg_prediction_error || 0) * row.players_analyzed, 0) / totalPredictions
    : 0;
  const latestBias = history?.[0]?.calibration_bias;
  const trend = (history || []).map(row => ({
    gameweek: row.gameweek?.name || `GW${row.gameweek_id}`,
    score: Number(row.accuracy_percentage || 0),
    mae: Number(row.avg_prediction_error || 0),
  })).reverse();
  const teamTrend = (optimalTeams || []).filter(row => row.actual_points != null).map(row => ({
    gameweek: row.gameweek?.name || `GW${row.gameweek_id}`,
    predicted: Number(row.total_predicted_points),
    actual: Number(row.actual_points),
  })).reverse();

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Model performance</h2>
          <p className="mt-1 text-sm text-muted-foreground">Score a completed gameweek, then use measured bias to calibrate future projections.</p>
        </div>
        <Button variant="outline" className="gap-2" disabled={!selectedGameweekId || updateResults.isPending} onClick={() => selectedGameweekId && updateResults.mutate(selectedGameweekId)}>
          <RefreshCw className={updateResults.isPending ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Score selected GW
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Target} label="Model score" value={`${weightedScore.toFixed(1)}%`} detail="Symmetric player-level score" />
        <Metric icon={CheckCircle2} label="Within ±2 points" value={totalPredictions ? `${(totalCorrect / totalPredictions * 100).toFixed(1)}%` : '0%'} detail={`${totalCorrect} of ${totalPredictions} projections`} />
        <Metric icon={Scale} label="Mean absolute error" value={weightedMae.toFixed(2)} detail="Average points missed; lower is better" />
        <Metric icon={BarChart3} label="Latest bias" value={latestBias == null ? '—' : `${latestBias > 0 ? '+' : ''}${Number(latestBias).toFixed(2)}`} detail="Actual minus predicted" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Model score trend" icon={TrendingUp} empty={!trend.length}>
          <AreaChart data={trend}>
            <defs><linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.28} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="gameweek" stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#scoreFill)" />
          </AreaChart>
        </ChartCard>
        <ChartCard title="Optimized XI: projected vs actual" icon={Trophy} empty={!teamTrend.length}>
          <BarChart data={teamTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="gameweek" stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="predicted" name="Projected" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} />
            <Bar dataKey="actual" name="Actual" fill="hsl(var(--accent))" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      {history?.length ? (
        <Card className="overflow-hidden border-border/60 shadow-sm">
          <CardHeader><CardTitle>Gameweek scoring log</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-5 py-3 text-left">Gameweek</th><th className="px-5 py-3 text-right">Score</th><th className="px-5 py-3 text-right">Within ±2</th><th className="px-5 py-3 text-right">MAE</th><th className="px-5 py-3 text-right">RMSE</th><th className="px-5 py-3 text-right">Bias</th></tr></thead>
              <tbody>{history.map(row => <tr key={row.id} className="border-t border-border/50"><td className="px-5 py-3 font-semibold">{row.gameweek?.name || `GW ${row.gameweek_id}`}</td><td className="px-5 py-3 text-right"><Badge variant="outline">{Number(row.accuracy_percentage || 0).toFixed(1)}%</Badge></td><td className="px-5 py-3 text-right font-mono">{Number(row.within_two_percentage ?? (row.players_analyzed ? row.correct_predictions / row.players_analyzed * 100 : 0)).toFixed(1)}%</td><td className="px-5 py-3 text-right font-mono">{Number(row.avg_prediction_error || 0).toFixed(2)}</td><td className="px-5 py-3 text-right font-mono">{row.rmse == null ? '—' : Number(row.rmse).toFixed(2)}</td><td className="px-5 py-3 text-right font-mono">{row.calibration_bias == null ? '—' : `${row.calibration_bias > 0 ? '+' : ''}${Number(row.calibration_bias).toFixed(2)}`}</td></tr>)}</tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Target; label: string; value: string; detail: string }) {
  return <Card className="border-border/60 shadow-sm"><CardContent className="flex items-start justify-between p-4"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-display text-2xl font-bold">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{detail}</p></div><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="h-4 w-4" /></div></CardContent></Card>;
}

function ChartCard({ title, icon: Icon, empty, children }: { title: string; icon: typeof Trophy; empty: boolean; children: React.ReactElement }) {
  return <Card className="border-border/60 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Icon className="h-4 w-4 text-primary" />{title}</CardTitle></CardHeader><CardContent>{empty ? <div className="flex h-[270px] items-center justify-center text-center text-sm text-muted-foreground">Score a completed gameweek to populate this chart.</div> : <ResponsiveContainer width="100%" height={270}>{children}</ResponsiveContainer>}</CardContent></Card>;
}

const tooltipStyle = { backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px' };
