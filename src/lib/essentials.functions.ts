import { createServerFn } from "@tanstack/react-start";

export interface FetchedMeta {
  title: string;
  description: string;
  image: string | null;
  price: string | null;
  source: string | null;
}

export const fetchLinkMetadata = createServerFn({ method: "POST" })
  .inputValidator((data: { url: string; token?: string }) => {
    if (!data?.url || typeof data.url !== "string") throw new Error("URL required");
    if (data.url.length > 2048) throw new Error("URL too long");
    return data;
  })
  .handler(async ({ data }): Promise<FetchedMeta> => {
    const { requireAdminFromRequest } = await import("./admin-guard.server");
    await requireAdminFromRequest(data.token);

    const { fetchLinkMeta } = await import("./link-meta.server");
    return await fetchLinkMeta(data.url.trim());
  });
