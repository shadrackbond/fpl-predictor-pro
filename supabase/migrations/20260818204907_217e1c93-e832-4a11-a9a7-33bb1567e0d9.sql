ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS starts integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS starts_per_90 numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saves integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS penalties_saved integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bps integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_per_game numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ep_next numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS value_form numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS value_season numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfers_in_event integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfers_out_event integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chance_of_playing_next_round integer,
  ADD COLUMN IF NOT EXISTS news text,
  ADD COLUMN IF NOT EXISTS news_added timestamp with time zone,
  ADD COLUMN IF NOT EXISTS expected_goals_per_90 numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_assists_per_90 numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_goal_involvements_per_90 numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamp with time zone;

ALTER TABLE public.player_predictions
  ADD COLUMN IF NOT EXISTS predicted_floor numeric,
  ADD COLUMN IF NOT EXISTS predicted_ceiling numeric,
  ADD COLUMN IF NOT EXISTS expected_minutes numeric,
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS risk_level text,
  ADD COLUMN IF NOT EXISTS fixture_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS model_version text,
  ADD COLUMN IF NOT EXISTS prediction_factors jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

ALTER TABLE public.prediction_sync_status
  ADD COLUMN IF NOT EXISTS model_version text;

ALTER TABLE public.optimal_teams
  ADD COLUMN IF NOT EXISTS model_version text;
