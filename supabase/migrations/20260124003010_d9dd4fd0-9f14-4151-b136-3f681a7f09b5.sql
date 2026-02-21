-- Create prediction_sync_status table to track prediction generation progress
CREATE TABLE public.prediction_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gameweek_id INTEGER NOT NULL UNIQUE,
  last_player_index INTEGER DEFAULT 0,
  total_players INTEGER DEFAULT 0,
  total_processed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.prediction_sync_status ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view prediction sync status"
ON public.prediction_sync_status
FOR SELECT
USING (true);

CREATE POLICY "Service can manage prediction sync status"
ON public.prediction_sync_status
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_prediction_sync_status_gameweek ON public.prediction_sync_status(gameweek_id);
CREATE INDEX idx_prediction_sync_status_status ON public.prediction_sync_status(status);