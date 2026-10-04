import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_materials",
  title: "List study materials",
  description: "List Dypol study materials, optionally filtered by subject or a title search.",
  inputSchema: {
    subject: z.string().trim().max(60).optional().describe("Subject to filter by, e.g. Physics."),
    search: z.string().trim().max(100).optional().describe("Text to search for in titles."),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ subject, search, limit }, ctx) => {
    let q = supabaseForUser(ctx)
      .from("materials")
      .select("id, title, subject, type, tier, description, dio_cost")
      .order("sort_order", { ascending: true })
      .limit(limit);
    if (subject) q = q.ilike("subject", subject);
    if (search) q = q.ilike("title", `%${search.replace(/[%_]/g, "")}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const materials = (data ?? []).map((m) => ({
      id: m.id, title: m.title, subject: m.subject, type: m.type, tier: m.tier,
      description: m.description, dio_cost: m.dio_cost,
    }));
    return { content: [{ type: "text", text: JSON.stringify(materials) }], structuredContent: { materials } };
  },
});
