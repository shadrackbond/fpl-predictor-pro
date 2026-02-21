import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, TrendingUp, Users, Target, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Player {
  id: number;
  web_name: string;
  position: string;
  form: number | null;
  selected_by_percent: number | null;
  total_points: number | null;
  team: { short_name: string } | null;
}

interface Prediction {
  player_id: number;
  predicted_points: number;
  fixture_difficulty: number | null;
  player: Player;
}

interface CaptainPickerProps {
  predictions: Prediction[];
  isLoading?: boolean;
}

export function CaptainPicker({ predictions, isLoading }: CaptainPickerProps) {
  const topCaptainOptions = useMemo(() => {
    if (!predictions || predictions.length === 0) return [];

    // Filter out goalkeepers and sort by predicted points
    return predictions
      .filter((p) => p.player?.position !== 'GKP')
      .sort((a, b) => b.predicted_points - a.predicted_points)
      .slice(0, 5)
      .map((pred, index) => ({
        ...pred,
        rank: index + 1,
        effectiveOwnership: pred.player?.selected_by_percent || 0,
        differentialScore: pred.predicted_points * (1 - (pred.player?.selected_by_percent || 0) / 100),
      }));
  }, [predictions]);

  if (isLoading) {
    return (
      <Card className="glass border-border/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-accent" />
            Captain Picker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (topCaptainOptions.length === 0) {
    return (
      <Card className="glass border-border/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-accent" />
            Captain Picker
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          Generate predictions to see captain recommendations.
        </CardContent>
      </Card>
    );
  }

  const topPick = topCaptainOptions[0];

  return (
    <Card className="glass border-border/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-accent" />
          Captain Picker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Top Pick Highlight */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30">
          <div className="flex items-center justify-between mb-3">
            <Badge className="bg-accent text-accent-foreground gap-1">
              <Crown className="w-3 h-3" />
              Top Captain Pick
            </Badge>
            <span className="text-2xl font-bold text-accent">{topPick.predicted_points.toFixed(1)} pts</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-xl font-bold text-accent">
              {topPick.player.web_name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-lg">{topPick.player.web_name}</p>
              <p className="text-sm text-muted-foreground">
                {topPick.player.team?.short_name} • {topPick.player.position}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Form</p>
              <p className="font-semibold">{topPick.player.form?.toFixed(1) || '-'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Ownership</p>
              <p className="font-semibold">{topPick.player.selected_by_percent?.toFixed(1)}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Fixture</p>
              <div className={cn(
                'inline-block px-2 py-0.5 rounded text-xs font-medium',
                `difficulty-${topPick.fixture_difficulty || 3}`
              )}>
                FDR {topPick.fixture_difficulty || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Other Options */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Alternative Options</p>
          {topCaptainOptions.slice(1).map((option) => (
            <div
              key={option.player_id}
              className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/30 hover:bg-card/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  {option.rank}
                </span>
                <div>
                  <p className="font-medium">{option.player.web_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {option.player.team?.short_name} • Form: {option.player.form?.toFixed(1) || '-'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">{option.predicted_points.toFixed(1)} pts</p>
                <p className="text-xs text-muted-foreground">
                  {option.player.selected_by_percent?.toFixed(1)}% owned
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Differential Captain */}
        {topCaptainOptions.length > 0 && (
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-medium text-orange-400">Differential Pick</span>
            </div>
            {(() => {
              const diffPick = [...topCaptainOptions]
                .sort((a, b) => b.differentialScore - a.differentialScore)[0];
              return (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{diffPick.player.web_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Only {diffPick.player.selected_by_percent?.toFixed(1)}% ownership
                    </p>
                  </div>
                  <p className="font-semibold">{diffPick.predicted_points.toFixed(1)} pts</p>
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
