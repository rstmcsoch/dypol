import { createServerFn } from "@tanstack/react-start";

export interface FetchedMeta {
  title: string;
  description: string;
  image: string | null;
  price: string | null;
  source: string | null;
}

export const fetchLinkMetadata = createServerFn({ method: "POST" })
  .inputValidator((data: { url: string }) => {
    if (!data?.url || typeof data.url !== "string") throw new Error("URL required");
    return data;
  })
  .handler(async ({ data }): Promise<FetchedMeta> => {
    const { fetchLinkMeta } = await import("./link-meta.server");
    return await fetchLinkMeta(data.url.trim());
  });
