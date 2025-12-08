import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, TrendingUp, Sparkles, Check, AlertCircle } from 'lucide-react';
import { POSITION_COLORS, type Position } from '@/types/fpl';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface Player {
  id: number;
  web_name: string;
  position: Position;
  price: number;
  form: number;
  total_points: number;
  team_id: number;
  teams?: { short_name: string };
  predicted_points?: number;
}

interface PlayerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (player: Player) => void;
  position?: Position;
  maxPrice: number;
  excludePlayerIds: number[];
  excludeTeamIds: number[];
  predictions: Map<number, number>;
}

export function PlayerSearchModal({
  isOpen,
  onClose,
  onSelect,
  position,
  maxPrice,
  excludePlayerIds,
  excludeTeamIds,
  predictions
}: PlayerSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'search' | 'suggested'>('suggested');

  // Fetch available players
  const { data: availablePlayers, isLoading } = useQuery({
    queryKey: ['available-players', position, maxPrice],
    queryFn: async () => {
      let query = supabase
        .from('players')
        .select(`
          id,
          web_name,
          position,
          price,
          form,
          total_points,
          team_id,
          teams (short_name)
        `)
        .lte('price', maxPrice)
        .order('form', { ascending: false })
        .limit(200);
      
      if (position) {
        query = query.eq('position', position);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(p => ({
        ...p,
        position: p.position as Position,
        teams: p.teams as { short_name: string } | undefined
      })) as Player[];
    },
    enabled: isOpen,
  });

  // Filter players based on search and exclusions
  const filteredPlayers = useMemo(() => {
    if (!availablePlayers) return [];
    
    return availablePlayers
      .filter(p => !excludePlayerIds.includes(p.id))
      .filter(p => !excludeTeamIds.includes(p.team_id))
      .filter(p => {
        if (!searchQuery.trim()) return true;
        return p.web_name.toLowerCase().includes(searchQuery.toLowerCase());
      });
  }, [availablePlayers, excludePlayerIds, excludeTeamIds, searchQuery]);

  // AI Suggested players (sorted by predicted points)
  const suggestedPlayers = useMemo(() => {
    return [...filteredPlayers]
      .map(p => ({
        ...p,
        predicted_points: predictions.get(p.id) || 0
      }))
      .sort((a, b) => (b.predicted_points || 0) - (a.predicted_points || 0))
      .slice(0, 10);
  }, [filteredPlayers, predictions]);

  // Reset search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setActiveTab('suggested');
    }
  }, [isOpen]);

  const positionLabels: Record<Position, string> = {
    GKP: 'Goalkeeper',
    DEF: 'Defender',
    MID: 'Midfielder',
    FWD: 'Forward'
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {position && (
              <Badge className={POSITION_COLORS[position]}>
                {positionLabels[position]}
              </Badge>
            )}
            Select Replacement Player
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Budget info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Max budget:</span>
            <Badge variant="outline" className="gap-1">
              £{maxPrice.toFixed(1)}M
            </Badge>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'search' | 'suggested')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="suggested" className="gap-2">
                <Sparkles className="w-4 h-4" />
                AI Suggested
              </TabsTrigger>
              <TabsTrigger value="search" className="gap-2">
                <Search className="w-4 h-4" />
                Search
              </TabsTrigger>
            </TabsList>

            <TabsContent value="suggested" className="mt-4">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : suggestedPlayers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No players available within budget</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-4">
                    {suggestedPlayers.map((player, idx) => (
                      <PlayerRow
                        key={player.id}
                        player={player}
                        rank={idx + 1}
                        predictions={predictions}
                        onSelect={() => onSelect(player)}
                        showPrediction
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="search" className="mt-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredPlayers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No players found</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-4">
                    {filteredPlayers.slice(0, 50).map(player => (
                      <PlayerRow
                        key={player.id}
                        player={player}
                        predictions={predictions}
                        onSelect={() => onSelect(player)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PlayerRowProps {
  player: Player;
  rank?: number;
  predictions: Map<number, number>;
  onSelect: () => void;
  showPrediction?: boolean;
}

function PlayerRow({ player, rank, predictions, onSelect, showPrediction }: PlayerRowProps) {
  const predictedPts = predictions.get(player.id) || 0;
  
  return (
    <button
      onClick={onSelect}
      className="w-full p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 hover:border-primary transition-colors flex items-center gap-3 text-left group"
    >
      {rank && (
        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
          {rank}
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate">{player.web_name}</span>
          <Badge variant="outline" className={`text-[10px] px-1 py-0 ${POSITION_COLORS[player.position]}`}>
            {player.position}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{player.teams?.short_name || 'N/A'}</span>
          <span>•</span>
          <span>£{player.price.toFixed(1)}M</span>
          <span>•</span>
          <span>Form: {player.form}</span>
        </div>
      </div>
      
      <div className="text-right">
        {showPrediction && predictedPts > 0 ? (
          <div className="flex items-center gap-1 text-primary font-semibold">
            <TrendingUp className="w-3 h-3" />
            {predictedPts.toFixed(1)} pts
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">{player.total_points} pts</span>
        )}
      </div>
      
      <Check className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
