import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef } from 'react';

export interface PredictionSyncStatus {
  id: string;
  gameweek_id: number;
  last_player_index: number;
  total_players: number;
  total_processed: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  model_version?: string | null;
  created_at: string;
  updated_at: string;
}

export function usePredictionStatus(gameweekId: number | null) {
  const queryClient = useQueryClient();
  const previousStatus = useRef<string | null>(null);

  const query = useQuery({
    queryKey: ['prediction-status', gameweekId],
    queryFn: async (): Promise<PredictionSyncStatus | null> => {
      if (!gameweekId) return null;
      const { data, error } = await supabase
        .from('prediction_sync_status')
        .select('*')
        .eq('gameweek_id', gameweekId)
        .maybeSingle();
      if (error) throw error;
      return data as PredictionSyncStatus | null;
    },
    enabled: Boolean(gameweekId),
    refetchInterval: query => (query.state.data as PredictionSyncStatus | null)?.status === 'processing' ? 1500 : false,
  });

  useEffect(() => {
    const current = query.data?.status || null;
    if (previousStatus.current === 'processing' && current === 'completed' && gameweekId) {
      queryClient.invalidateQueries({ queryKey: ['predictions', gameweekId] });
      queryClient.invalidateQueries({ queryKey: ['optimal-team', gameweekId] });
    }
    previousStatus.current = current;
  }, [query.data?.status, gameweekId, queryClient]);

  return query;
}

export function formatTimeSince(dateString: string | null): string {
  if (!dateString) return 'Never';
  const elapsed = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(elapsed / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
