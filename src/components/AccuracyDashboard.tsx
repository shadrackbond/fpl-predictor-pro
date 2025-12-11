import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  Target, 
  BarChart3, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  Trophy,
  Zap
} from 'lucide-react';
import { usePredictionHistory, useUpdateActualResults, useAllOptimalTeams } from '@/hooks/usePredictionHistory';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface AccuracyDashboardProps {
  selectedGameweekId: number | null;
}

export function AccuracyDashboard({ selectedGameweekId }: AccuracyDashboardProps) {
  const { data: history, isLoading } = usePredictionHistory();
  const { data: optimalTeams } = useAllOptimalTeams();
  const updateResults = useUpdateActualResults();

  const handleUpdateResults = () => {
    if (selectedGameweekId) {
      updateResults.mutate(selectedGameweekId);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  // Calculate overall stats
  const totalPredictions = history?.reduce((sum, h) => sum + (h.players_analyzed || 0), 0) || 0;
  const totalCorrect = history?.reduce((sum, h) => sum + (h.correct_predictions || 0), 0) || 0;
  const avgAccuracy = history && history.length > 0
    ? history.reduce((sum, h) => sum + (h.accuracy_percentage || 0), 0) / history.length
    : 0;
  const avgError = history && history.length > 0
    ? history.reduce((sum, h) => sum + (h.avg_prediction_error || 0), 0) / history.length
    : 0;

  // Prepare chart data
  const chartData = history?.map(h => ({
    gameweek: `GW${h.gameweek_id}`,
    accuracy: h.accuracy_percentage || 0,
    predicted: h.total_predicted_points || 0,
    actual: h.total_actual_points || 0,
  })).reverse() || [];

  // Optimal team performance data
  const teamChartData = optimalTeams?.filter(t => t.actual_points !== null).map(t => ({
    gameweek: `GW${t.gameweek_id}`,
    predicted: t.total_predicted_points,
    actual: t.actual_points || 0,
    accuracy: t.accuracy_percentage || 0,
  })).reverse() || [];

  return (
    <div className="space-y-6">
      {/* Header with Update Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Prediction Accuracy</h2>
          <p className="text-muted-foreground">Track how well our AI predictions perform</p>
        </div>
        <Button
          onClick={handleUpdateResults}
          disabled={updateResults.isPending || !selectedGameweekId}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={updateResults.isPending ? 'animate-spin' : ''} />
          Update Results
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overall Accuracy
            </CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gradient">
              {avgAccuracy.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average prediction accuracy
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Correct Predictions
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-fpl-green" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalCorrect}
              <span className="text-lg text-muted-foreground">/{totalPredictions}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Within 2 points of actual
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Point Error
            </CardTitle>
            <XCircle className="h-4 w-4 text-fpl-red" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {avgError.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Points off per player
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gameweeks Analyzed
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-fpl-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {history?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Historical gameweeks tracked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Accuracy Trend */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Accuracy Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="gameweek" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="accuracy" 
                    stroke="hsl(var(--primary))" 
                    fill="url(#accuracyGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No accuracy data yet. Update results after gameweeks complete.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Optimal Team Performance */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" />
              Optimal Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teamChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={teamChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="gameweek" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="predicted" name="Predicted" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Actual" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No optimal team results yet. Update results after gameweeks complete.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gameweek History Table */}
      {history && history.length > 0 && (
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Gameweek Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Gameweek</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Predicted</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actual</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Accuracy</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Correct</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Avg Error</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium">GW {h.gameweek_id}</td>
                      <td className="text-right py-3 px-4">{h.total_predicted_points?.toFixed(0) || '-'}</td>
                      <td className="text-right py-3 px-4">{h.total_actual_points?.toFixed(0) || '-'}</td>
                      <td className="text-right py-3 px-4">
                        <Badge 
                          variant="outline" 
                          className={
                            (h.accuracy_percentage || 0) >= 80 ? 'border-fpl-green text-fpl-green' :
                            (h.accuracy_percentage || 0) >= 60 ? 'border-fpl-gold text-fpl-gold' :
                            'border-fpl-red text-fpl-red'
                          }
                        >
                          {h.accuracy_percentage?.toFixed(1) || 0}%
                        </Badge>
                      </td>
                      <td className="text-right py-3 px-4">
                        {h.correct_predictions || 0}/{h.players_analyzed || 0}
                      </td>
                      <td className="text-right py-3 px-4 text-muted-foreground">
                        ±{h.avg_prediction_error?.toFixed(1) || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
