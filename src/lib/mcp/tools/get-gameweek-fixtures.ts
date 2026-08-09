import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_gameweek_fixtures",
  title: "Get gameweek fixtures",
  description:
    "Get fixtures and difficulty ratings for a gameweek. Omit gameweek_id to use the current gameweek.",
  inputSchema: {
    gameweek_id: z.number().int().optional().describe("Gameweek number. Defaults to the current gameweek."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ gameweek_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    const { data: gwRow } = gameweek_id
      ? await supabase.from("gameweeks").select("*").eq("id", gameweek_id).maybeSingle()
      : await supabase.from("gameweeks").select("*").eq("is_current", true).maybeSingle();

    if (!gwRow) {
      return { content: [{ type: "text", text: "Gameweek not found." }], isError: true };
    }

    const { data, error } = await supabase
      .from("fixtures")
      .select(
        "kickoff_time, finished, home_team_difficulty, away_team_difficulty, home_team:home_team_id (short_name), away_team:away_team_id (short_name)"
      )
      .eq("gameweek_id", gwRow.id)
      .order("kickoff_time", { ascending: true });

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const payload = { gameweek: gwRow, fixtures: data ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
