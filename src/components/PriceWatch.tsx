import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PriceChange {
  id: number;
  player_id: number;
  old_price: number;
  new_price: number;
  change_date: string;
  player?: {
    web_name: string;
    position: string;
    team_id: number;
    teams?: { short_name: string };
    selected_by_percent: number;
    form: number;
  };
}

interface PlayerWithTransferTrend {
  id: number;
  web_name: string;
  position: string;
  price: number;
  selected_by_percent: number;
  form: number;
  team?: { short_name: string };
  transfer_trend: 'rising' | 'falling' | 'stable';
}

export function PriceWatch() {
  // Fetch recent price changes
  const { data: priceChanges, isLoading: loadingChanges } = useQuery({
    queryKey: ['price-changes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_changes')
        .select(`
          *,
          player:player_id (
            web_name,
            position,
            team_id,
            teams:team_id (short_name),
            selected_by_percent,
            form
          )
        `)
        .order('change_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as PriceChange[];
    },
  });

  // Fetch players likely to rise/fall based on ownership trends
  const { data: trendingPlayers, isLoading: loadingTrending } = useQuery({
    queryKey: ['trending-prices'],
    queryFn: async () => {
      // Get players with high ownership changes (simulated based on selected_by_percent and form)
      const { data, error } = await supabase
        .from('players')
        .select(`
          id,
          web_name,
          position,
          price,
          selected_by_percent,
          form,
          team:team_id (short_name)
        `)
        .order('form', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Calculate likely price movement based on ownership and form
      const withTrends: PlayerWithTransferTrend[] = (data || []).map((p) => {
        const ownership = p.selected_by_percent || 0;
        const form = p.form || 0;
        
        // High form + moderate ownership = likely to rise
        // Low form + high ownership = likely to fall
        let trend: 'rising' | 'falling' | 'stable' = 'stable';
        if (form > 6 && ownership < 30) {
          trend = 'rising';
        } else if (form < 3 && ownership > 15) {
          trend = 'falling';
        }
        
        return {
          ...p,
          team: p.team as { short_name: string } | undefined,
          transfer_trend: trend,
        };
      });

      // Separate into rising and falling
      const rising = withTrends.filter((p) => p.transfer_trend === 'rising').slice(0, 5);
      const falling = withTrends.filter((p) => p.transfer_trend === 'falling').slice(0, 5);

      return { rising, falling };
    },
  });

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GKP': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'DEF': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'MID': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'FWD': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const isLoading = loadingChanges || loadingTrending;

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-card border-border">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4, 5].map((j) => (
                <Skeleton key={j} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const hasRecentChanges = priceChanges && priceChanges.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Recent Price Changes */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Recent Changes
          </CardTitle>
          <CardDescription>Confirmed price changes</CardDescription>
        </CardHeader>
        <CardContent>
          {hasRecentChanges ? (
            <div className="space-y-3">
              {priceChanges.map((change) => {
                const diff = change.new_price - change.old_price;
                const isRise = diff > 0;
                return (
                  <div
                    key={change.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isRise ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        {isRise ? (
                          <TrendingUp className="w-4 h-4 text-green-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{change.player?.web_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {change.player?.teams?.short_name} •{' '}
                          {formatDistanceToNow(new Date(change.change_date), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Badge className={isRise ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                      {isRise ? '+' : ''}£{diff.toFixed(1)}m
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No recent price changes recorded</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Likely to Rise */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Likely to Rise
          </CardTitle>
          <CardDescription>High form, low ownership</CardDescription>
        </CardHeader>
        <CardContent>
          {trendingPlayers?.rising && trendingPlayers.rising.length > 0 ? (
            <div className="space-y-3">
              {trendingPlayers.rising.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={getPositionColor(player.position)}>{player.position}</Badge>
                    <div>
                      <p className="font-medium">{player.web_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {player.team?.short_name} • {player.selected_by_percent?.toFixed(1)}% owned
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">£{player.price?.toFixed(1)}m</p>
                    <p className="text-xs text-green-400">Form: {player.form?.toFixed(1)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No players likely to rise</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Likely to Fall */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            Likely to Fall
          </CardTitle>
          <CardDescription>Low form, high ownership</CardDescription>
        </CardHeader>
        <CardContent>
          {trendingPlayers?.falling && trendingPlayers.falling.length > 0 ? (
            <div className="space-y-3">
              {trendingPlayers.falling.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={getPositionColor(player.position)}>{player.position}</Badge>
                    <div>
                      <p className="font-medium">{player.web_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {player.team?.short_name} • {player.selected_by_percent?.toFixed(1)}% owned
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">£{player.price?.toFixed(1)}m</p>
                    <p className="text-xs text-red-400">Form: {player.form?.toFixed(1)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No players likely to fall</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
