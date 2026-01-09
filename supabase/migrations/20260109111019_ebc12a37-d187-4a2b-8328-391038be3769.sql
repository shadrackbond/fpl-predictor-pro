-- Add set piece tracking columns to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS penalties_order INTEGER DEFAULT NULL;
ALTER TABLE players ADD COLUMN IF NOT EXISTS corners_order INTEGER DEFAULT NULL;
ALTER TABLE players ADD COLUMN IF NOT EXISTS direct_freekicks_order INTEGER DEFAULT NULL;

-- Create index for set piece queries
CREATE INDEX IF NOT EXISTS idx_players_penalties ON players(penalties_order) WHERE penalties_order IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_players_corners ON players(corners_order) WHERE corners_order IS NOT NULL;