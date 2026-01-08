-- Add performance indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_player_predictions_gw_player ON player_predictions(gameweek_id, player_id);
CREATE INDEX IF NOT EXISTS idx_player_predictions_gw_points ON player_predictions(gameweek_id, predicted_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_teams_user ON user_teams(user_id, fpl_team_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_gameweek ON fixtures(gameweek_id);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
CREATE INDEX IF NOT EXISTS idx_optimal_teams_gameweek ON optimal_teams(gameweek_id);
CREATE INDEX IF NOT EXISTS idx_differential_alerts_gameweek ON differential_alerts(gameweek_id, is_active);

-- Add price tracking table
CREATE TABLE IF NOT EXISTS price_changes (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id),
  old_price NUMERIC NOT NULL,
  new_price NUMERIC NOT NULL,
  change_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on price_changes
ALTER TABLE price_changes ENABLE ROW LEVEL SECURITY;

-- Allow public read access to price changes (it's public data)
CREATE POLICY "Anyone can view price changes" ON price_changes FOR SELECT USING (true);

-- Create index for price_changes lookups
CREATE INDEX IF NOT EXISTS idx_price_changes_player ON price_changes(player_id);
CREATE INDEX IF NOT EXISTS idx_price_changes_date ON price_changes(change_date DESC);