import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useUserTeam() {
  return useQuery({
    queryKey: ['user-team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_teams')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });
}

export function useAnalyzeUserTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ fpl_team_id, gameweek_id }: { fpl_team_id: number; gameweek_id: number | null }) => {
      const response = await supabase.functions.invoke('analyze-user-team', {
        body: { fpl_team_id, gameweek_id },
      });
      
      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-team'] });
      toast.success('Team analysis complete!');
    },
    onError: (error) => {
      console.error('Failed to analyze team:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze team');
    },
  });
}
