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
  created_at: string;
  updated_at: string;
}

// Check if prediction generation appears stuck (hasn't updated in 5 minutes)
function isStuck(status: PredictionSyncStatus | null): boolean {
  if (!status || status.status !== 'processing') return false;
  
  const lastUpdate = new Date(status.updated_at).getTime();
  const now = Date.now();
  const minutesSinceUpdate = (now - lastUpdate) / (60 * 1000);
  
  return minutesSinceUpdate > 5; // Stuck if no updates for 5 minutes
}

export function usePredictionStatus(gameweekId: number | null) {
  const queryClient = useQueryClient();
  const prevStatusRef = useRef<string | null>(null);

  const query = useQuery({
    queryKey: ['prediction-status', gameweekId],
    queryFn: async (): Promise<PredictionSyncStatus | null> => {
      if (!gameweekId) return null;
      
      const { data, error } = await supabase
        .from('prediction_sync_status')
        .select('*')
        .eq('gameweek_id', gameweekId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching prediction status:', error);
        return null;
      }
      
      return data as PredictionSyncStatus | null;
    },
    enabled: !!gameweekId,
    refetchInterval: (query) => {
      const data = query.state.data as PredictionSyncStatus | null;
      // Poll every 3 seconds while processing
      return data?.status === 'processing' ? 3000 : false;
    },
  });

  // When status transitions from processing to completed, refresh predictions
  useEffect(() => {
    const currentStatus = query.data?.status || null;
    if (prevStatusRef.current === 'processing' && currentStatus === 'completed' && gameweekId) {
      queryClient.invalidateQueries({ queryKey: ['predictions', gameweekId] });
      queryClient.invalidateQueries({ queryKey: ['optimal-team', gameweekId] });
    }
    prevStatusRef.current = currentStatus;
  }, [query.data?.status, gameweekId, queryClient]);

  return query;
}

export function formatTimeSince(dateString: string | null): string {
  if (!dateString) return 'Never';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}
