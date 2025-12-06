import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Trophy,
  Target
} from 'lucide-react';

interface TeamComparisonProps {
  comparison: {
    current_predicted_points: number;
    optimal_potential_points: number;
    performance_diff: number;
  };
}

export function TeamComparison({ comparison }: TeamComparisonProps) {
  const diffFromOptimal = comparison.optimal_potential_points - comparison.current_predicted_points;
  const performancePercent = Math.min(100, Math.max(0, comparison.performance_diff));
  
  const getPerformanceColor = (pct: number) => {
    if (pct >= 90) return 'text-green-400';
    if (pct >= 75) return 'text-amber-400';
    return 'text-red-400';
  };

  const getPerformanceLabel = (pct: number) => {
    if (pct >= 95) return 'Excellent';
    if (pct >= 85) return 'Very Good';
    if (pct >= 75) return 'Good';
    if (pct >= 60) return 'Average';
    return 'Needs Work';
  };

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
      <CardContent className="pt-6">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Current Predicted Points */}
          <div className="text-center p-4 rounded-lg bg-card/50">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Your Team Prediction</p>
            <p className="text-3xl font-bold text-primary">
              {comparison.current_predicted_points.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">Expected Points</p>
          </div>

          {/* Optimal Points */}
          <div className="text-center p-4 rounded-lg bg-card/50">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-accent" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Optimal Team Prediction</p>
            <p className="text-3xl font-bold text-accent">
              {comparison.optimal_potential_points.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">Maximum Potential</p>
          </div>

          {/* Performance Diff */}
          <div className="text-center p-4 rounded-lg bg-card/50">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <TrendingUp className={`w-6 h-6 ${getPerformanceColor(performancePercent)}`} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Performance Rating</p>
            <p className={`text-3xl font-bold ${getPerformanceColor(performancePercent)}`}>
              {performancePercent}%
            </p>
            <p className="text-xs text-muted-foreground">
              {getPerformanceLabel(performancePercent)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Team Optimization Level</span>
            <span className={`font-medium ${getPerformanceColor(performancePercent)}`}>
              {diffFromOptimal > 0 
                ? `${diffFromOptimal.toFixed(1)} pts below optimal` 
                : 'At optimal level'}
            </span>
          </div>
          <Progress value={performancePercent} className="h-3" />
        </div>

        {performancePercent < 85 && (
          <p className="mt-4 text-sm text-muted-foreground text-center">
            Consider the suggested transfers above to close the gap to the optimal team.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
