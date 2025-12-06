-- Create user_teams table to store imported FPL teams
CREATE TABLE public.user_teams (
  id SERIAL PRIMARY KEY,
  fpl_team_id INTEGER NOT NULL UNIQUE,
  team_name TEXT,
  overall_rank INTEGER,
  overall_points INTEGER,
  gameweek_points INTEGER,
  free_transfers INTEGER DEFAULT 1,
  bank NUMERIC DEFAULT 0,
  active_chip TEXT,
  chips_available JSONB DEFAULT '[]'::jsonb,
  player_ids INTEGER[] NOT NULL DEFAULT '{}',
  captain_id INTEGER,
  vice_captain_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_teams ENABLE ROW LEVEL SECURITY;

-- Anyone can view user teams (public feature)
CREATE POLICY "Anyone can view user teams" 
ON public.user_teams 
FOR SELECT 
USING (true);

-- Service can manage user teams
CREATE POLICY "Service can manage user teams" 
ON public.user_teams 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create transfer_suggestions table to store AI transfer recommendations
CREATE TABLE public.transfer_suggestions (
  id SERIAL PRIMARY KEY,
  user_team_id INTEGER REFERENCES public.user_teams(id) ON DELETE CASCADE,
  gameweek_id INTEGER,
  player_out_id INTEGER,
  player_in_id INTEGER,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  points_impact NUMERIC,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.transfer_suggestions ENABLE ROW LEVEL SECURITY;

-- Anyone can view transfer suggestions
CREATE POLICY "Anyone can view transfer suggestions" 
ON public.transfer_suggestions 
FOR SELECT 
USING (true);

-- Service can manage transfer suggestions
CREATE POLICY "Service can manage transfer suggestions" 
ON public.transfer_suggestions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create chip_analysis table
CREATE TABLE public.chip_analysis (
  id SERIAL PRIMARY KEY,
  user_team_id INTEGER REFERENCES public.user_teams(id) ON DELETE CASCADE,
  gameweek_id INTEGER,
  chip_name TEXT NOT NULL,
  success_percentage NUMERIC,
  recommendation TEXT,
  analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chip_analysis ENABLE ROW LEVEL SECURITY;

-- Anyone can view chip analysis
CREATE POLICY "Anyone can view chip analysis" 
ON public.chip_analysis 
FOR SELECT 
USING (true);

-- Service can manage chip analysis
CREATE POLICY "Service can manage chip analysis" 
ON public.chip_analysis 
FOR ALL 
USING (true)
WITH CHECK (true);