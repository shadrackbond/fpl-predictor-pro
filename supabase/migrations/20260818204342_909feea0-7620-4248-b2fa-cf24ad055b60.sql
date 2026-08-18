-- Drop permissive public-role "Service can manage" policies.
-- Backend processes use the service role, which bypasses RLS entirely.
DROP POLICY IF EXISTS "Service can manage chip analysis" ON public.chip_analysis;
DROP POLICY IF EXISTS "Service can manage transfer suggestions" ON public.transfer_suggestions;
DROP POLICY IF EXISTS "Service can manage fixtures" ON public.fixtures;
DROP POLICY IF EXISTS "Service can manage gameweeks" ON public.gameweeks;
DROP POLICY IF EXISTS "Service can manage players" ON public.players;
DROP POLICY IF EXISTS "Service can manage teams" ON public.teams;
DROP POLICY IF EXISTS "Service can manage news articles" ON public.news_articles;
DROP POLICY IF EXISTS "Service can manage optimal teams" ON public.optimal_teams;
DROP POLICY IF EXISTS "Service can manage player hype" ON public.player_hype;
DROP POLICY IF EXISTS "Service can manage predictions" ON public.player_predictions;
DROP POLICY IF EXISTS "Service can manage prediction history" ON public.prediction_history;
DROP POLICY IF EXISTS "Service can manage prediction sync status" ON public.prediction_sync_status;
DROP POLICY IF EXISTS "Service can manage differential alerts" ON public.differential_alerts;
DROP POLICY IF EXISTS "Service can manage price changes" ON public.price_changes;

-- Ensure service_role retains full privileges for backend processes.
GRANT ALL ON public.chip_analysis TO service_role;
GRANT ALL ON public.transfer_suggestions TO service_role;
GRANT ALL ON public.fixtures TO service_role;
GRANT ALL ON public.gameweeks TO service_role;
GRANT ALL ON public.players TO service_role;
GRANT ALL ON public.teams TO service_role;
GRANT ALL ON public.news_articles TO service_role;
GRANT ALL ON public.optimal_teams TO service_role;
GRANT ALL ON public.player_hype TO service_role;
GRANT ALL ON public.player_predictions TO service_role;
GRANT ALL ON public.prediction_history TO service_role;
GRANT ALL ON public.prediction_sync_status TO service_role;
GRANT ALL ON public.differential_alerts TO service_role;
GRANT ALL ON public.price_changes TO service_role;

-- Remove client write privileges on read-only reference tables.
REVOKE INSERT, UPDATE, DELETE ON public.fixtures FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.gameweeks FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.players FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.teams FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.news_articles FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.optimal_teams FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.player_hype FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.player_predictions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.prediction_history FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.prediction_sync_status FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.differential_alerts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.price_changes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.chip_analysis FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.transfer_suggestions FROM anon, authenticated;

-- Owner-scoped read access only for per-user derived data.
DROP POLICY IF EXISTS "Users can view their own chip analysis" ON public.chip_analysis;
CREATE POLICY "Users can view their own chip analysis"
ON public.chip_analysis FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_teams ut WHERE ut.id = chip_analysis.user_team_id AND ut.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view their own transfer suggestions" ON public.transfer_suggestions;
CREATE POLICY "Users can view their own transfer suggestions"
ON public.transfer_suggestions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_teams ut WHERE ut.id = transfer_suggestions.user_team_id AND ut.user_id = auth.uid()));

REVOKE SELECT ON public.chip_analysis FROM anon;
REVOKE SELECT ON public.transfer_suggestions FROM anon;

-- The signup trigger function must not be directly callable through the API.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
