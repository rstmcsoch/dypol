import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface FetchedMeta {
  title: string;
  description: string;
  image: string | null;
  price: string | null;
  source: string | null;
}

export const fetchLinkMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { url: string }) => {
    if (!data?.url || typeof data.url !== "string") throw new Error("URL required");
    if (data.url.length > 2048) throw new Error("URL too long");
    return data;
  })
  .handler(async ({ data, context }): Promise<FetchedMeta> => {
    const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error || !isAdmin) throw new Error("Forbidden");

    const { fetchLinkMeta } = await import("./link-meta.server");
    return await fetchLinkMeta(data.url.trim());
  });
