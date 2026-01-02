import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DifferentialAlert {
  id: number;
  player_id: number;
  gameweek_id: number;
  alert_type: 'rising_star' | 'injury_doubt' | 'rotation_risk' | 'value_pick' | 'form_surge' | 'fixture_swing';
  reason: string;
  confidence: number;
  ownership_percent: number;
  predicted_points: number;
  is_active: boolean;
  created_at: string;
  player?: {
    id: number;
    web_name: string;
    position: string;
    price: number;
    form: number;
    selected_by_percent: number;
    teams?: { name: string; short_name: string };
  };
}

export interface NewsArticle {
  id: number;
  source: string;
  title: string;
  content: string;
  url: string;
  published_at: string;
  scraped_at: string;
  relevance_score: number;
  player_mentions: number[];
}

export interface PlayerHype {
  id: number;
  player_id: number;
  gameweek_id: number;
  hype_score: number;
  mentions: number;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  sources: string[];
  trending_direction: 'up' | 'down' | 'stable';
}

export function useDifferentialAlerts(gameweekId: number | null) {
  return useQuery({
    queryKey: ['differential-alerts', gameweekId],
    queryFn: async () => {
      if (!gameweekId) return [];
      
      const { data, error } = await supabase
        .from('differential_alerts')
        .select(`
          *,
          player:players(
            id,
            web_name,
            position,
            price,
            form,
            selected_by_percent,
            teams(name, short_name)
          )
        `)
        .eq('gameweek_id', gameweekId)
        .eq('is_active', true)
        .order('confidence', { ascending: false });
      
      if (error) throw error;
      return data as DifferentialAlert[];
    },
    enabled: !!gameweekId,
  });
}

export function useNewsArticles() {
  return useQuery({
    queryKey: ['news-articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .order('scraped_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as NewsArticle[];
    },
  });
}

export function usePlayerHype(gameweekId: number | null) {
  return useQuery({
    queryKey: ['player-hype', gameweekId],
    queryFn: async () => {
      if (!gameweekId) return [];
      
      const { data, error } = await supabase
        .from('player_hype')
        .select(`
          *,
          player:players(
            id,
            web_name,
            position,
            teams(name, short_name)
          )
        `)
        .eq('gameweek_id', gameweekId)
        .order('hype_score', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as (PlayerHype & { player: any })[];
    },
    enabled: !!gameweekId,
  });
}

export function useScrapeNews() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke('scrape-fpl-news', {
        body: {},
      });
      
      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['news-articles'] });
      queryClient.invalidateQueries({ queryKey: ['player-hype'] });
      toast.success(`Scraped ${data.articles_scraped} articles, found ${data.players_mentioned} player mentions!`);
    },
    onError: (error) => {
      console.error('Failed to scrape news:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to scrape news');
    },
  });
}

export function useAnalyzeDifferentials() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (gameweekId: number) => {
      const response = await supabase.functions.invoke('analyze-differentials', {
        body: { gameweek_id: gameweekId },
      });
      
      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['differential-alerts'] });
      toast.success(`Generated ${data.alerts_generated} differential alerts!`);
    },
    onError: (error) => {
      console.error('Failed to analyze differentials:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze differentials');
    },
  });
}
