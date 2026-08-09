import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_team",
  title: "Get my FPL team",
  description:
    "Get the signed-in user's saved Fantasy Premier League team: squad player IDs, captain, bank, free transfers, rank and points.",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("user_teams")
      .select("*")
      .eq("user_id", ctx.getUserId())
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!data) {
      return {
        content: [{ type: "text", text: "No team saved yet. Import your FPL team in the app first." }],
      };
    }

    const { data: players } = await supabase
      .from("players")
      .select("fpl_id, web_name, position, price, form, total_points, status")
      .in("fpl_id", data.player_ids ?? []);

    return {
      content: [{ type: "text", text: JSON.stringify({ team: data, players: players ?? [] }, null, 2) }],
      structuredContent: { team: data, players: players ?? [] },
    };
  },
});
