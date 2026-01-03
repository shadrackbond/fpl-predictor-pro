-- Tighten RLS for private, user-specific tables

-- user_teams: remove public access to rows with NULL user_id
DROP POLICY IF EXISTS "Users can view their own teams" ON public.user_teams;
CREATE POLICY "Users can view their own teams"
ON public.user_teams
FOR SELECT
USING (auth.uid() = user_id);

-- transfer_suggestions: restrict viewing to suggestions linked to the authenticated user's teams
DROP POLICY IF EXISTS "Anyone can view transfer suggestions" ON public.transfer_suggestions;
CREATE POLICY "Users can view their own transfer suggestions"
ON public.transfer_suggestions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_teams ut
    WHERE ut.id = transfer_suggestions.user_team_id
      AND ut.user_id = auth.uid()
  )
);

-- chip_analysis: restrict viewing to chip analysis linked to the authenticated user's teams
DROP POLICY IF EXISTS "Anyone can view chip analysis" ON public.chip_analysis;
CREATE POLICY "Users can view their own chip analysis"
ON public.chip_analysis
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_teams ut
    WHERE ut.id = chip_analysis.user_team_id
      AND ut.user_id = auth.uid()
  )
);
