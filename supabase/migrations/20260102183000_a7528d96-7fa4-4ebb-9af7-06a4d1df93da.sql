-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add user_id to user_teams
ALTER TABLE public.user_teams ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Update user_teams RLS policies for user-specific access
DROP POLICY IF EXISTS "Anyone can view user teams" ON public.user_teams;
DROP POLICY IF EXISTS "Service can manage user teams" ON public.user_teams;

CREATE POLICY "Users can view their own teams"
ON public.user_teams FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own teams"
ON public.user_teams FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own teams"
ON public.user_teams FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own teams"
ON public.user_teams FOR DELETE
USING (auth.uid() = user_id);

-- News articles table
CREATE TABLE public.news_articles (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  title TEXT,
  content TEXT,
  url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  relevance_score NUMERIC,
  player_mentions JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view news articles"
ON public.news_articles FOR SELECT
USING (true);

CREATE POLICY "Service can manage news articles"
ON public.news_articles FOR ALL
USING (true)
WITH CHECK (true);

-- Player hype tracking table
CREATE TABLE public.player_hype (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id),
  gameweek_id INTEGER REFERENCES gameweeks(id),
  hype_score NUMERIC DEFAULT 0,
  mentions INTEGER DEFAULT 0,
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
  sources JSONB DEFAULT '[]'::jsonb,
  trending_direction TEXT CHECK (trending_direction IN ('up', 'down', 'stable')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(player_id, gameweek_id)
);

ALTER TABLE public.player_hype ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view player hype"
ON public.player_hype FOR SELECT
USING (true);

CREATE POLICY "Service can manage player hype"
ON public.player_hype FOR ALL
USING (true)
WITH CHECK (true);

-- Differential alerts table
CREATE TABLE public.differential_alerts (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id),
  gameweek_id INTEGER REFERENCES gameweeks(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('rising_star', 'injury_doubt', 'rotation_risk', 'value_pick', 'form_surge', 'fixture_swing')),
  reason TEXT,
  confidence NUMERIC,
  ownership_percent NUMERIC,
  predicted_points NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.differential_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view differential alerts"
ON public.differential_alerts FOR SELECT
USING (true);

CREATE POLICY "Service can manage differential alerts"
ON public.differential_alerts FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_player_hype_player_gw ON public.player_hype(player_id, gameweek_id);
CREATE INDEX idx_differential_alerts_gw ON public.differential_alerts(gameweek_id, is_active);
CREATE INDEX idx_news_articles_scraped ON public.news_articles(scraped_at DESC);