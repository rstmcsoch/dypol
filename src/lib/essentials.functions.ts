import { createServerFn } from "@tanstack/react-start";

export interface FetchedMeta {
  title: string;
  description: string;
  image: string | null;
  price: string | null;
  source: string | null;
}

function pick(html: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return decode(m[1].trim());
  }
  return null;
}

function decode(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function absolutize(base: string, url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url, base).toString();
  } catch {
    return null;
  }
}

export const fetchLinkMetadata = createServerFn({ method: "POST" })
  .inputValidator((data: { url: string }) => {
    if (!data?.url || typeof data.url !== "string") throw new Error("URL required");
    return data;
  })
  .handler(async ({ data }): Promise<FetchedMeta> => {
    const target = data.url.trim();
    let res: Response;
    try {
      res = await fetch(target, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; DypolBot/1.0; +https://dypol.lovable.app)",
          accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
    } catch (e) {
      throw new Error(`Fetch failed: ${(e as Error).message}`);
    }
    if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);
    const html = (await res.text()).slice(0, 500_000);

    const title =
      pick(html, [
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
        /<title[^>]*>([^<]+)<\/title>/i,
      ]) ?? "";

    const description =
      pick(html, [
        /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i,
      ]) ?? "";

    const rawImage = pick(html, [
      /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
    ]);
    const image = absolutize(res.url || target, rawImage);

    const price = pick(html, [
      /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:price:amount["'][^>]+content=["']([^"']+)["']/i,
      /"price"\s*:\s*"?([0-9]+(?:\.[0-9]+)?)"?/i,
    ]);
    const currency = pick(html, [
      /<meta[^>]+property=["']product:price:currency["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:price:currency["'][^>]+content=["']([^"']+)["']/i,
    ]);

    let source: string | null = null;
    try {
      source = new URL(res.url || target).hostname.replace(/^www\./, "");
    } catch {
      source = null;
    }

    return {
      title,
      description,
      image,
      price: price ? (currency ? `${currency} ${price}` : price) : null,
      source,
    };
  });
