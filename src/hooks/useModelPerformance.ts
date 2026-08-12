import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ModelPerformanceRow {
  id: number;
  gameweek_id: number;
  total_predicted_points: number;
  total_actual_points: number | null;
  accuracy_percentage: number | null;
  players_analyzed: number;
  correct_predictions: number;
  avg_prediction_error: number | null;
  rmse?: number | null;
  within_two_percentage?: number | null;
  calibration_bias?: number | null;
  gameweek?: { fpl_id: number; name: string; finished: boolean } | null;
}

interface ScoredTeamRow {
  id: number;
  gameweek_id: number;
  total_predicted_points: number;
  actual_points: number | null;
  gameweek?: { fpl_id: number; name: string } | null;
}

export function useModelPerformance() {
  return useQuery({
    queryKey: ['model-performance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prediction_history')
        .select('*, gameweek:gameweek_id(fpl_id, name, finished)')
        .order('gameweek_id', { ascending: false });
      if (error) throw error;
      return data as ModelPerformanceRow[];
    },
  });
}

export function useScoredOptimalTeams() {
  return useQuery({
    queryKey: ['scored-optimal-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('optimal_teams')
        .select('id, gameweek_id, total_predicted_points, actual_points, gameweek:gameweek_id(fpl_id, name)')
        .not('actual_points', 'is', null)
        .order('gameweek_id', { ascending: false });
      if (error) throw error;
      return data as ScoredTeamRow[];
    },
  });
}

export function useScoreGameweek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (gameweekId: number) => {
      const response = await supabase.functions.invoke('update-actual-results', { body: { gameweek_id: gameweekId } });
      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['model-performance'] });
      queryClient.invalidateQueries({ queryKey: ['scored-optimal-teams'] });
      queryClient.invalidateQueries({ queryKey: ['prediction-history'] });
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
      queryClient.invalidateQueries({ queryKey: ['optimal-team'] });
      toast.success(`Gameweek scored: ${data.accuracy_percentage?.toFixed(1)} model score · ${data.avg_prediction_error?.toFixed(2)} MAE`);
    },
    onError: error => toast.error(error instanceof Error ? error.message : 'Failed to score results'),
  });
}
