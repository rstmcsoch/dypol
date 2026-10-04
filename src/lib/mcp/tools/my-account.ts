import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_account",
  title: "Get my account",
  description: "Show the signed-in user's target exam, Dio balance, and saved bookmarks.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    const uid = ctx.getUserId()!;
    const [p, w, b] = await Promise.all([
      sb.from("profiles").select("display_name, selected_exam, preparation_year").eq("id", uid).maybeSingle(),
      sb.from("dio_wallets").select("balance").eq("user_id", uid).maybeSingle(),
      sb.from("bookmarks").select("kind, title, url").eq("user_id", uid).order("created_at", { ascending: false }).limit(50),
    ]);
    const err = p.error ?? w.error ?? b.error;
    if (err) return { content: [{ type: "text", text: err.message }], isError: true };
    const account = {
      display_name: p.data?.display_name ?? null,
      exam: p.data?.selected_exam ?? null,
      year: p.data?.preparation_year ?? null,
      dio_balance: w.data?.balance ?? 0,
      bookmarks: (b.data ?? []).map((x) => ({ kind: x.kind, title: x.title, url: x.url })),
    };
    return { content: [{ type: "text", text: JSON.stringify(account) }], structuredContent: { account } };
  },
});
