import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_top_predictions",
  title: "Get top predicted players",
  description:
    "Get this app's highest predicted point scorers for a gameweek, with price, form and ownership. Omit gameweek_id to use the current gameweek.",
  inputSchema: {
    gameweek_id: z.number().int().optional().describe("Gameweek number. Defaults to the current gameweek."),
    position: z.enum(["GKP", "DEF", "MID", "FWD"]).optional().describe("Filter by position."),
    limit: z.number().int().optional().describe("How many players to return (default 15, max 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ gameweek_id, position, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    let gw = gameweek_id;
    if (!gw) {
      const { data: current } = await supabase
        .from("gameweeks")
        .select("id")
        .eq("is_current", true)
        .maybeSingle();
      gw = current?.id ?? undefined;
    }
    if (!gw) {
      return { content: [{ type: "text", text: "No current gameweek found." }], isError: true };
    }

    const take = Math.min(Math.max(limit ?? 15, 1), 50);
    const { data, error } = await supabase
      .from("player_predictions")
      .select(
        "predicted_points, player:player_id (fpl_id, web_name, position, price, form, status, selected_by_percent, total_points, teams:team_id (short_name))"
      )
      .eq("gameweek_id", gw)
      .order("predicted_points", { ascending: false })
      .limit(120);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = (data ?? [])
      .filter((r: any) => (position ? r.player?.position === position : true))
      .slice(0, take)
      .map((r: any) => ({
        name: r.player?.web_name,
        team: r.player?.teams?.short_name,
        position: r.player?.position,
        price: r.player?.price,
        form: r.player?.form,
        ownership: r.player?.selected_by_percent,
        status: r.player?.status,
        predicted_points: r.predicted_points,
      }));

    return {
      content: [{ type: "text", text: JSON.stringify({ gameweek_id: gw, players: rows }, null, 2) }],
      structuredContent: { gameweek_id: gw, players: rows },
    };
  },
});
