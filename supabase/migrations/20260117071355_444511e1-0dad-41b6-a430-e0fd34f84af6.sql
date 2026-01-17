-- Add advanced performance stats columns to players table
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS expected_goals DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS expected_assists DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS expected_goal_involvement DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS threat DECIMAL(6,1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS creativity DECIMAL(6,1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS influence DECIMAL(6,1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ict_index DECIMAL(6,1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS shots DECIMAL(5,1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS shots_in_box DECIMAL(5,1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS key_passes DECIMAL(5,1) DEFAULT 0;

-- Create indexes for performance queries
CREATE INDEX IF NOT EXISTS idx_players_expected_goals ON public.players(expected_goals DESC);
CREATE INDEX IF NOT EXISTS idx_players_threat ON public.players(threat DESC);
CREATE INDEX IF NOT EXISTS idx_players_position_xg ON public.players(position, expected_goals DESC);