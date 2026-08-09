import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyTeamTool from "./tools/get-my-team";
import getTopPredictionsTool from "./tools/get-top-predictions";
import searchPlayersTool from "./tools/search-players";
import getGameweekFixturesTool from "./tools/get-gameweek-fixtures";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "fpl-predictor-pro",
  title: "FPL Predictor Pro",
  version: "0.1.0",
  instructions:
    "Tools for FPL Predictor Pro, a Fantasy Premier League analytics app. Use `get_my_team` for the signed-in manager's squad, `get_top_predictions` for the app's predicted point scorers, `search_players` for player stats, and `get_gameweek_fixtures` for fixtures and difficulty ratings.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyTeamTool, getTopPredictionsTool, searchPlayersTool, getGameweekFixturesTool],
});
