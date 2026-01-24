import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

export function usePredictionStatus(gameweekId: number | null) {
  return useQuery({
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
      // Poll every 2 seconds while processing
      const data = query.state.data as PredictionSyncStatus | null;
      return data?.status === 'processing' ? 2000 : false;
    },
  });
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
