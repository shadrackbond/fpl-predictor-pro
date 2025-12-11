import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PredictionHistory {
  id: number;
  gameweek_id: number;
  total_predicted_points: number;
  total_actual_points: number | null;
  accuracy_percentage: number | null;
  players_analyzed: number;
  correct_predictions: number;
  avg_prediction_error: number | null;
  created_at: string;
  updated_at: string;
}

interface OptimalTeamWithActual {
  id: number;
  gameweek_id: number;
  total_predicted_points: number;
  actual_points: number | null;
  accuracy_percentage: number | null;
  formation: string;
  team_rating: number;
}

export function usePredictionHistory() {
  return useQuery({
    queryKey: ['prediction-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prediction_history')
        .select('*')
        .order('gameweek_id', { ascending: false });
      
      if (error) throw error;
      return data as PredictionHistory[];
    },
  });
}

export function useAllOptimalTeams() {
  return useQuery({
    queryKey: ['all-optimal-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('optimal_teams')
        .select('id, gameweek_id, total_predicted_points, actual_points, accuracy_percentage, formation, team_rating')
        .order('gameweek_id', { ascending: false });
      
      if (error) throw error;
      return data as OptimalTeamWithActual[];
    },
  });
}

export function useUpdateActualResults() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (gameweekId: number) => {
      const response = await supabase.functions.invoke('update-actual-results', {
        body: { gameweek_id: gameweekId },
      });
      
      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prediction-history'] });
      queryClient.invalidateQueries({ queryKey: ['all-optimal-teams'] });
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
      queryClient.invalidateQueries({ queryKey: ['optimal-team'] });
      toast.success(`Results updated! Accuracy: ${data.accuracy_percentage?.toFixed(1)}%`);
    },
    onError: (error) => {
      console.error('Failed to update results:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update results');
    },
  });
}
