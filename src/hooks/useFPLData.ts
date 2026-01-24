import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useGameweeks() {
  return useQuery({
    queryKey: ['gameweeks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gameweeks')
        .select('*')
        .order('fpl_id', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
}

export function usePlayers() {
  return useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select(`*, teams:team_id (id, name, short_name)`)
        .order('total_points', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function usePredictions(gameweekId: number | null) {
  return useQuery({
    queryKey: ['predictions', gameweekId],
    queryFn: async () => {
      if (!gameweekId) return [];
      
      const { data, error } = await supabase
        .from('player_predictions')
        .select(`
          *,
          player:player_id (
            id, web_name, position, price, form, total_points, status,
            teams:team_id (id, name, short_name)
          )
        `)
        .eq('gameweek_id', gameweekId)
        .order('predicted_points', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    },
    enabled: !!gameweekId,
  });
}

export function useOptimalTeam(gameweekId: number | null) {
  return useQuery({
    queryKey: ['optimal-team', gameweekId],
    queryFn: async () => {
      if (!gameweekId) return null;
      
      const { data, error } = await supabase
        .from('optimal_teams')
        .select('*')
        .eq('gameweek_id', gameweekId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!gameweekId,
  });
}

export function useFixtures(gameweekId: number | null) {
  return useQuery({
    queryKey: ['fixtures', gameweekId],
    queryFn: async () => {
      if (!gameweekId) return [];
      
      const { data, error } = await supabase
        .from('fixtures')
        .select(`
          *,
          home_team:teams!fixtures_home_team_id_fkey (id, name, short_name),
          away_team:teams!fixtures_away_team_id_fkey (id, name, short_name)
        `)
        .eq('gameweek_id', gameweekId)
        .order('kickoff_time', { ascending: true });
      
      if (error) throw error;
      return data as any[];
    },
    enabled: !!gameweekId,
  });
}

export function useFetchFPLData() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke('fetch-fpl-data');
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameweeks'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['fixtures'] });
      toast.success('FPL data updated successfully!');
    },
    onError: (error) => {
      console.error('Failed to fetch FPL data:', error);
      toast.error('Failed to fetch FPL data');
    },
  });
}

export function useGeneratePredictions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ gameweek_id, force_refresh = false }: { gameweek_id: number; force_refresh?: boolean }) => {
      const response = await supabase.functions.invoke('generate-predictions', {
        body: { gameweek_id, force_refresh },
      });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data, { gameweek_id }) => {
      queryClient.invalidateQueries({ queryKey: ['predictions', gameweek_id] });
      queryClient.invalidateQueries({ queryKey: ['optimal-team', gameweek_id] });
      queryClient.invalidateQueries({ queryKey: ['prediction-status', gameweek_id] });
      
      if (data?.cached) {
        toast.success('Using cached predictions (updated ' + formatRelativeTime(data.completed_at) + ')');
      } else if (data?.status === 'processing') {
        toast.info('Predictions are being generated...');
      } else {
        toast.success('Predictions generated successfully!');
      }
    },
    onError: (error) => {
      console.error('Failed to generate predictions:', error);
      toast.error('Failed to generate predictions');
    },
  });
}

function formatRelativeTime(dateString: string): string {
  if (!dateString) return 'recently';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffMins < 60) return `${diffMins}m ago`;
  return `${diffHours}h ago`;
}
