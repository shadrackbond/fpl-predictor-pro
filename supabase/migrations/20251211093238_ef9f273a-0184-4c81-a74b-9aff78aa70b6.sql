-- Add actual points tracking to optimal_teams
ALTER TABLE public.optimal_teams 
ADD COLUMN IF NOT EXISTS actual_points numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS accuracy_percentage numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Add actual points to player_predictions
ALTER TABLE public.player_predictions
ADD COLUMN IF NOT EXISTS actual_points numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS prediction_accuracy numeric DEFAULT NULL;

-- Create prediction_history table for tracking overall accuracy
CREATE TABLE IF NOT EXISTS public.prediction_history (
  id serial PRIMARY KEY,
  gameweek_id integer REFERENCES public.gameweeks(id),
  total_predicted_points numeric NOT NULL,
  total_actual_points numeric DEFAULT NULL,
  accuracy_percentage numeric DEFAULT NULL,
  players_analyzed integer DEFAULT 0,
  correct_predictions integer DEFAULT 0,
  avg_prediction_error numeric DEFAULT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(gameweek_id)
);

-- Enable RLS
ALTER TABLE public.prediction_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view prediction history" 
ON public.prediction_history 
FOR SELECT 
USING (true);

CREATE POLICY "Service can manage prediction history" 
ON public.prediction_history 
FOR ALL 
USING (true)
WITH CHECK (true);