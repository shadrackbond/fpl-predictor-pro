import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_players",
  title: "Search players",
  description:
    "Search current Premier League players by name and return their FPL stats: price, form, points, ownership and availability status.",
  inputSchema: {
    query: z.string().describe("Part of a player's name, e.g. 'Salah'."),
    limit: z.number().int().optional().describe("How many players to return (default 10, max 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const term = query.trim();
    if (!term) {
      return { content: [{ type: "text", text: "query must not be empty" }], isError: true };
    }

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("players")
      .select(
        "fpl_id, web_name, first_name, second_name, position, price, form, status, minutes, total_points, goals_scored, assists, selected_by_percent, teams:team_id (short_name, name)"
      )
      .or(`web_name.ilike.%${term}%,second_name.ilike.%${term}%,first_name.ilike.%${term}%`)
      .order("total_points", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 10, 1), 25));

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { players: data ?? [] },
    };
  },
});
