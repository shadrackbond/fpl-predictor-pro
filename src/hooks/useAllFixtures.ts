import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAllFixtures() {
  return useQuery({
    queryKey: ['all-fixtures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fixtures')
        .select(`
          *,
          home_team:teams!fixtures_home_team_id_fkey (id, name, short_name),
          away_team:teams!fixtures_away_team_id_fkey (id, name, short_name)
        `)
        .order('kickoff_time', { ascending: true });
      
      if (error) throw error;
      return data as any[];
    },
  });
}
