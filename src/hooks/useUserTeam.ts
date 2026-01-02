import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export function useUserTeam() {
  const [userId, setUserId] = useState<string | null>(null);
  
  // Get current user session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    
    return () => subscription.unsubscribe();
  }, []);
  
  return useQuery({
    queryKey: ['user-team', userId],
    queryFn: async () => {
      const query = supabase
        .from('user_teams')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);
      
      // If user is logged in, filter by their user_id
      if (userId) {
        query.eq('user_id', userId);
      }
      
      const { data, error } = await query.maybeSingle();
      
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

export function useDeleteUserTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (teamId: number) => {
      const { error } = await supabase
        .from('user_teams')
        .delete()
        .eq('id', teamId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-team'] });
      toast.success('Team removed. You can now import a new team.');
    },
    onError: (error) => {
      console.error('Failed to remove team:', error);
      toast.error('Failed to remove team');
    },
  });
}
