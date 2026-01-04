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
      // Only fetch if user is logged in
      if (!userId) return null;

      const { data, error } = await supabase
        .from('user_teams')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    // Only enable query when we have a userId
    enabled: !!userId,
    // Avoid "auto refresh" feel when users switch tabs/pages; mutations explicitly invalidate.
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
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
      // Invalidate the user-specific query so the imported team appears immediately.
      supabase.auth.getUser().then(({ data: { user } }) => {
        queryClient.invalidateQueries({ queryKey: ['user-team', user?.id ?? null] });
      }).catch(() => {
        // Fallback to broad invalidation if we can't get the user id
        queryClient.invalidateQueries({ queryKey: ['user-team'] });
      });
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
      // Invalidate the specific user's team query so UI updates after deletion
      supabase.auth.getUser().then(({ data: { user } }) => {
        queryClient.invalidateQueries({ queryKey: ['user-team', user?.id ?? null] });
      }).catch(() => {
        queryClient.invalidateQueries({ queryKey: ['user-team'] });
      });
      toast.success('Team removed. You can now import a new team.');
    },
    onError: (error) => {
      console.error('Failed to remove team:', error);
      toast.error('Failed to remove team');
    },
  });
}
