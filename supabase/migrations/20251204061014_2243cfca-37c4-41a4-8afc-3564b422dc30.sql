-- FPL Prediction System Database Schema

-- Teams table (Premier League teams)
CREATE TABLE public.teams (
  id SERIAL PRIMARY KEY,
  fpl_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  strength_overall INTEGER,
  strength_attack_home INTEGER,
  strength_attack_away INTEGER,
  strength_defence_home INTEGER,
  strength_defence_away INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Players table
CREATE TABLE public.players (
  id SERIAL PRIMARY KEY,
  fpl_id INTEGER UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  second_name TEXT NOT NULL,
  web_name TEXT NOT NULL,
  team_id INTEGER REFERENCES public.teams(id),
  position TEXT NOT NULL, -- GKP, DEF, MID, FWD
  price DECIMAL(4,1) NOT NULL,
  total_points INTEGER DEFAULT 0,
  minutes INTEGER DEFAULT 0,
  goals_scored INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  clean_sheets INTEGER DEFAULT 0,
  goals_conceded INTEGER DEFAULT 0,
  bonus INTEGER DEFAULT 0,
  form DECIMAL(3,1) DEFAULT 0,
  selected_by_percent DECIMAL(5,2) DEFAULT 0,
  status TEXT DEFAULT 'a', -- a = available, d = doubtful, i = injured, u = unavailable
  photo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Gameweeks table
CREATE TABLE public.gameweeks (
  id SERIAL PRIMARY KEY,
  fpl_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  deadline_time TIMESTAMP WITH TIME ZONE,
  is_current BOOLEAN DEFAULT false,
  is_next BOOLEAN DEFAULT false,
  finished BOOLEAN DEFAULT false,
  average_score DECIMAL(5,2),
  highest_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fixtures table
CREATE TABLE public.fixtures (
  id SERIAL PRIMARY KEY,
  fpl_id INTEGER UNIQUE NOT NULL,
  gameweek_id INTEGER REFERENCES public.gameweeks(id),
  home_team_id INTEGER REFERENCES public.teams(id),
  away_team_id INTEGER REFERENCES public.teams(id),
  home_team_difficulty INTEGER,
  away_team_difficulty INTEGER,
  kickoff_time TIMESTAMP WITH TIME ZONE,
  home_score INTEGER,
  away_score INTEGER,
  finished BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Player predictions table
CREATE TABLE public.player_predictions (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES public.players(id) ON DELETE CASCADE,
  gameweek_id INTEGER REFERENCES public.gameweeks(id) ON DELETE CASCADE,
  predicted_points DECIMAL(4,1) NOT NULL,
  fixture_difficulty INTEGER,
  form_factor DECIMAL(3,2),
  ai_analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(player_id, gameweek_id)
);

-- Optimal teams table
CREATE TABLE public.optimal_teams (
  id SERIAL PRIMARY KEY,
  gameweek_id INTEGER REFERENCES public.gameweeks(id) ON DELETE CASCADE,
  player_ids INTEGER[] NOT NULL,
  starting_xi INTEGER[] NOT NULL,
  captain_id INTEGER,
  vice_captain_id INTEGER,
  total_predicted_points DECIMAL(5,1) NOT NULL,
  team_rating INTEGER NOT NULL, -- 0-100
  formation TEXT NOT NULL,
  analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(gameweek_id)
);

-- Create indexes for better performance
CREATE INDEX idx_players_team ON public.players(team_id);
CREATE INDEX idx_players_position ON public.players(position);
CREATE INDEX idx_fixtures_gameweek ON public.fixtures(gameweek_id);
CREATE INDEX idx_predictions_gameweek ON public.player_predictions(gameweek_id);

-- Enable RLS but allow public read access (this is public FPL data)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gameweeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimal_teams ENABLE ROW LEVEL SECURITY;

-- Public read policies (anyone can view FPL data)
CREATE POLICY "Anyone can view teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Anyone can view players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Anyone can view gameweeks" ON public.gameweeks FOR SELECT USING (true);
CREATE POLICY "Anyone can view fixtures" ON public.fixtures FOR SELECT USING (true);
CREATE POLICY "Anyone can view predictions" ON public.player_predictions FOR SELECT USING (true);
CREATE POLICY "Anyone can view optimal teams" ON public.optimal_teams FOR SELECT USING (true);

-- Service role can insert/update (for edge functions)
CREATE POLICY "Service can manage teams" ON public.teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage players" ON public.players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage gameweeks" ON public.gameweeks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage fixtures" ON public.fixtures FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage predictions" ON public.player_predictions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage optimal teams" ON public.optimal_teams FOR ALL USING (true) WITH CHECK (true);