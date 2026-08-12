import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useGameweeks() {
  return useQuery({
    queryKey: ['gameweeks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gameweeks').select('*').order('fpl_id');
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlayers() {
  return useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*, teams:team_id(id, name, short_name)')
        .order('total_points', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
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
            id, fpl_id, first_name, second_name, web_name, team_id, position,
            price, form, total_points, status, minutes, selected_by_percent,
            chance_of_playing_next_round, news, last_synced_at,
            teams:team_id (id, name, short_name)
          )
        `)
        .eq('gameweek_id', gameweekId)
        .order('predicted_points', { ascending: false });
      if (error) throw error;
      // The generated database type lags nested relation inference; callers receive the runtime row shape above.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data as any[];
    },
    enabled: Boolean(gameweekId),
    staleTime: 5 * 60 * 1000,
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
    enabled: Boolean(gameweekId),
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
        .order('kickoff_time');
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data as any[];
    },
    enabled: Boolean(gameweekId),
  });
}

export function useFetchFPLData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke('fetch-fpl-data');
      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameweeks'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['fixtures'] });
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
      toast.success('Official FPL data is up to date.');
    },
    onError: error => toast.error(error instanceof Error ? error.message : 'Failed to sync FPL data'),
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
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data, { gameweek_id }) => {
      queryClient.invalidateQueries({ queryKey: ['prediction-status', gameweek_id] });
      if (data?.cached) {
        queryClient.invalidateQueries({ queryKey: ['predictions', gameweek_id] });
        queryClient.invalidateQueries({ queryKey: ['optimal-team', gameweek_id] });
        toast.success(`Using projections calculated ${relativeTime(data.completed_at)}.`);
      } else if (data?.status === 'processing') {
        toast.info('Projection refresh is already running.');
      } else {
        queryClient.invalidateQueries({ queryKey: ['predictions', gameweek_id] });
        queryClient.invalidateQueries({ queryKey: ['optimal-team', gameweek_id] });
        toast.success(`Predictions generated with ${data?.model_version || 'the latest model'}.`);
      }
    },
    onError: error => toast.error(error instanceof Error ? error.message : 'Failed to calculate projections'),
  });
}

function relativeTime(dateString: string): string {
  if (!dateString) return 'recently';
  const minutes = Math.floor((Date.now() - new Date(dateString).getTime()) / 60_000);
  return minutes < 60 ? `${Math.max(0, minutes)}m ago` : `${Math.floor(minutes / 60)}h ago`;
}
