-- Prediction Engine v2: richer official FPL inputs and explainable projection outputs.
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS chance_of_playing_next_round INTEGER,
  ADD COLUMN IF NOT EXISTS news TEXT,
  ADD COLUMN IF NOT EXISTS news_added TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS points_per_game NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS starts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS starts_per_90 NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_goals_per_90 NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_assists_per_90 NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_goal_involvements_per_90 NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saves INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS penalties_saved INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bps INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfers_in_event INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfers_out_event INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ep_next NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS value_form NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS value_season NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.player_predictions
  ADD COLUMN IF NOT EXISTS predicted_floor NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS predicted_ceiling NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_minutes NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confidence INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS fixture_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS model_version TEXT DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS prediction_factors JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

ALTER TABLE public.prediction_history
  ADD COLUMN IF NOT EXISTS rmse NUMERIC,
  ADD COLUMN IF NOT EXISTS within_two_percentage NUMERIC,
  ADD COLUMN IF NOT EXISTS calibration_bias NUMERIC;

ALTER TABLE public.prediction_sync_status
  ADD COLUMN IF NOT EXISTS model_version TEXT;

CREATE INDEX IF NOT EXISTS idx_predictions_gw_confidence
  ON public.player_predictions(gameweek_id, confidence DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_model_version
  ON public.player_predictions(model_version);

ALTER TABLE public.player_predictions
  DROP CONSTRAINT IF EXISTS player_predictions_risk_level_check;
ALTER TABLE public.player_predictions
  ADD CONSTRAINT player_predictions_risk_level_check
  CHECK (risk_level IN ('low', 'medium', 'high'));
