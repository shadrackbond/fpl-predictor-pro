import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useDifferentialAlerts, 
  usePlayerHype, 
  useScrapeNews, 
  useAnalyzeDifferentials 
} from '@/hooks/useDifferentials';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Star, 
  AlertTriangle, 
  Zap, 
  Target, 
  Flame,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface DifferentialsDashboardProps {
  gameweekId: number | null;
}

const ALERT_TYPE_CONFIG = {
  rising_star: { icon: Star, color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30', label: 'Rising Star' },
  value_pick: { icon: Target, color: 'bg-green-500/10 text-green-500 border-green-500/30', label: 'Value Pick' },
  form_surge: { icon: Flame, color: 'bg-orange-500/10 text-orange-500 border-orange-500/30', label: 'In Form' },
  fixture_swing: { icon: Zap, color: 'bg-blue-500/10 text-blue-500 border-blue-500/30', label: 'Easy Fixture' },
  injury_doubt: { icon: AlertTriangle, color: 'bg-red-500/10 text-red-500 border-red-500/30', label: 'Injury Doubt' },
  rotation_risk: { icon: AlertTriangle, color: 'bg-amber-500/10 text-amber-500 border-amber-500/30', label: 'Rotation Risk' },
};

export function DifferentialsDashboard({ gameweekId }: DifferentialsDashboardProps) {
  const { data: alerts, isLoading: loadingAlerts } = useDifferentialAlerts(gameweekId);
  const { data: hypeData, isLoading: loadingHype } = usePlayerHype(gameweekId);
  const scrapeNews = useScrapeNews();
  const analyzeDifferentials = useAnalyzeDifferentials();

  const handleRefreshIntel = async () => {
    await scrapeNews.mutateAsync();
    if (gameweekId) {
      await analyzeDifferentials.mutateAsync(gameweekId);
    }
  };

  const isRefreshing = scrapeNews.isPending || analyzeDifferentials.isPending;

  if (loadingAlerts || loadingHype) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  const positiveAlerts = alerts?.filter(a => 
    ['rising_star', 'value_pick', 'form_surge', 'fixture_swing'].includes(a.alert_type)
  ) || [];
  
  const warningAlerts = alerts?.filter(a => 
    ['injury_doubt', 'rotation_risk'].includes(a.alert_type)
  ) || [];

  const trendingPlayers = hypeData?.filter(h => h.trending_direction === 'up').slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Differentials & Intelligence</h2>
          <p className="text-muted-foreground">AI-powered picks based on news, hype, and data analysis</p>
        </div>
        <Button
          onClick={handleRefreshIntel}
          disabled={isRefreshing}
          className="gap-2"
        >
          {isRefreshing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Refresh Intel
            </>
          )}
        </Button>
      </div>

      {/* Trending Players */}
      {trendingPlayers.length > 0 && (
        <Card className="glass border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Trending Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {trendingPlayers.map(player => (
                <Badge 
                  key={player.id}
                  variant="outline" 
                  className="px-3 py-1.5 gap-2 bg-green-500/5 border-green-500/30"
                >
                  <span className="font-medium">{player.player?.web_name}</span>
                  <span className="text-green-500">+{player.mentions} mentions</span>
                  {player.sentiment === 'positive' && (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Differential Alerts Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Hot Picks */}
        <Card className="glass border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flame className="w-5 h-5 text-orange-500" />
              Hot Differential Picks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {positiveAlerts.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">
                No differentials found. Click "Refresh Intel" to analyze.
              </p>
            ) : (
              positiveAlerts.slice(0, 6).map(alert => {
                const config = ALERT_TYPE_CONFIG[alert.alert_type];
                const Icon = config.icon;
                
                return (
                  <div 
                    key={alert.id}
                    className="p-3 rounded-lg bg-card/50 border border-border/30 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className={`${config.color} gap-1`}>
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                        <span className="font-semibold">{alert.player?.web_name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-primary">
                          {alert.predicted_points?.toFixed(1)} pts
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {alert.ownership_percent?.toFixed(1)}% owned
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.reason}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${alert.confidence}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {alert.confidence?.toFixed(0)}% confidence
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Warnings */}
        <Card className="glass border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Watch List
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {warningAlerts.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">
                No injury or rotation concerns detected.
              </p>
            ) : (
              warningAlerts.slice(0, 6).map(alert => {
                const config = ALERT_TYPE_CONFIG[alert.alert_type];
                const Icon = config.icon;
                
                return (
                  <div 
                    key={alert.id}
                    className="p-3 rounded-lg bg-card/50 border border-border/30 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className={`${config.color} gap-1`}>
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                        <span className="font-semibold">{alert.player?.web_name}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.reason}</p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Player Hype Leaderboard */}
      {hypeData && hypeData.length > 0 && (
        <Card className="glass border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-primary" />
              Hype Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 font-medium text-muted-foreground">Player</th>
                    <th className="text-center py-2 font-medium text-muted-foreground">Hype</th>
                    <th className="text-center py-2 font-medium text-muted-foreground">Mentions</th>
                    <th className="text-center py-2 font-medium text-muted-foreground">Sentiment</th>
                    <th className="text-center py-2 font-medium text-muted-foreground">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {hypeData.slice(0, 10).map((player, index) => (
                    <tr key={player.id} className="border-b border-border/30 last:border-0">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground w-5">{index + 1}.</span>
                          <span className="font-medium">{player.player?.web_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {player.player?.position}
                          </Badge>
                        </div>
                      </td>
                      <td className="text-center py-2.5">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${Math.min(100, player.hype_score)}%` }}
                            />
                          </div>
                          <span className="text-xs">{player.hype_score?.toFixed(0)}</span>
                        </div>
                      </td>
                      <td className="text-center py-2.5">{player.mentions}</td>
                      <td className="text-center py-2.5">
                        <Badge 
                          variant="outline"
                          className={
                            player.sentiment === 'positive' ? 'bg-green-500/10 text-green-500 border-green-500/30' :
                            player.sentiment === 'negative' ? 'bg-red-500/10 text-red-500 border-red-500/30' :
                            'bg-muted text-muted-foreground'
                          }
                        >
                          {player.sentiment}
                        </Badge>
                      </td>
                      <td className="text-center py-2.5">
                        {player.trending_direction === 'up' && <TrendingUp className="w-4 h-4 text-green-500 mx-auto" />}
                        {player.trending_direction === 'down' && <TrendingDown className="w-4 h-4 text-red-500 mx-auto" />}
                        {player.trending_direction === 'stable' && <Minus className="w-4 h-4 text-muted-foreground mx-auto" />}
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
