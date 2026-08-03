export interface FetchedMetaResult {
  title: string;
  description: string;
  image: string | null;
  price: string | null;
  source: string | null;
}

function decode(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&nbsp;/g, " ");
}

function pick(html: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return decode(m[1].trim());
  }
  return null;
}

function absolutize(base: string, url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url.replace(/\\\//g, "/"), base).toString();
  } catch {
    return null;
  }
}

const BAD_IMAGE = /(logo|sprite|placeholder|icon|favicon|nav-|transparent-pixel|grey-pixel|1x1|blank|banner|amazon-?ads|default[-_]?image)/i;

function isLikelyProductImage(url: string | null): boolean {
  if (!url) return false;
  if (!/^https?:\/\//i.test(url)) return false;
  if (BAD_IMAGE.test(url)) return false;
  if (/\.svg(\?|$)/i.test(url)) return false;
  return true;
}

/** Amazon: the main gallery image lives in data-a-dynamic-image / hiRes / large keys. */
function amazonImage(html: string): string | null {
  const dyn = html.match(/data-a-dynamic-image\s*=\s*(?:"|&quot;)?\{([^}]*)\}/i);
  if (dyn && dyn[1]) {
    const urls = [...decode(dyn[1]).matchAll(/(https?:\\?\/\\?\/[^"'\\]+?\.(?:jpg|jpeg|png|webp))/gi)].map(
      (m) => m[1]!.replace(/\\\//g, "/"),
    );
    const found = urls.find(isLikelyProductImage);
    if (found) return found;
  }
  const keyed = [...html.matchAll(/"(?:hiRes|large|mainUrl|main)"\s*:\s*"(https?:[^"]+?\.(?:jpg|jpeg|png|webp))"/gi)].map(
    (m) => m[1]!.replace(/\\\//g, "/"),
  );
  const k = keyed.find(isLikelyProductImage);
  if (k) return k;

  const wrapper = html.match(
    /id=["'](?:landingImage|imgBlkFront|main-image)["'][^>]*?\s(?:data-old-hires|src)=["']([^"']+)["']/i,
  );
  if (wrapper && wrapper[1] && isLikelyProductImage(decode(wrapper[1]))) return decode(wrapper[1]);
  return null;
}

/** Structured data: schema.org Product image is the canonical product photo. */
function jsonLdImage(html: string): string | null {
  const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(decode(b[1]!.trim()));
    } catch {
      continue;
    }
    const found = findProductImage(parsed);
    if (found) return found;
  }
  return null;
}

function findProductImage(node: unknown, depth = 0): string | null {
  if (!node || depth > 6) return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findProductImage(n, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  const isProduct = Array.isArray(type)
    ? type.some((t) => typeof t === "string" && /product|offer/i.test(t))
    : typeof type === "string" && /product|offer/i.test(type);
  if (isProduct) {
    const img = firstImage(obj["image"]);
    if (img && isLikelyProductImage(img)) return img;
  }
  for (const v of Object.values(obj)) {
    const r = findProductImage(v, depth + 1);
    if (r) return r;
  }
  return null;
}

function firstImage(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return firstImage(value[0]);
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return firstImage(o["url"] ?? o["contentUrl"]);
  }
  return null;
}

/** Fallback: first large-looking <img> inside the page body. */
function firstBodyImage(html: string): string | null {
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  for (const tag of imgs) {
    const src =
      pick(tag, [
        /\sdata-old-hires=["']([^"']+)["']/i,
        /\sdata-zoom-image=["']([^"']+)["']/i,
        /\sdata-large-image=["']([^"']+)["']/i,
        /\sdata-src=["']([^"']+)["']/i,
        /\ssrc=["']([^"']+)["']/i,
      ]) ?? null;
    if (src && isLikelyProductImage(src)) return src;
    const srcset = pick(tag, [/\ssrcset=["']([^"']+)["']/i]);
    if (srcset) {
      const cand = srcset.split(",").map((s) => s.trim().split(/\s+/)[0]!).find(isLikelyProductImage);
      if (cand) return cand;
    }
  }
  return null;
}

export async function fetchLinkMeta(target: string): Promise<FetchedMetaResult> {
  let res: Response;
  try {
    res = await fetch(target, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
  } catch (e) {
    throw new Error(`Fetch failed: ${(e as Error).message}`);
  }
  if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);
  const html = (await res.text()).slice(0, 2_000_000);
  const base = res.url || target;
  const host = (() => {
    try {
      return new URL(base).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  const title =
    pick(html, [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
      /<span[^>]+id=["']productTitle["'][^>]*>([^<]+)<\/span>/i,
      /<title[^>]*>([^<]+)<\/title>/i,
    ]) ?? "";

  const description =
    pick(html, [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i,
    ]) ?? "";

  // Product photo first, generic social/site image only as a last resort.
  const candidates: (string | null)[] = [
    /amazon\./i.test(host) ? amazonImage(html) : null,
    jsonLdImage(html),
    pick(html, [
      /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    ]),
    firstBodyImage(html),
    pick(html, [/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i]),
  ];

  let image: string | null = null;
  for (const c of candidates) {
    const abs = absolutize(base, c);
    if (isLikelyProductImage(abs)) {
      image = abs;
      break;
    }
  }

  const price = pick(html, [
    /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:price:amount["'][^>]+content=["']([^"']+)["']/i,
    /"price"\s*:\s*"?([0-9]+(?:\.[0-9]+)?)"?/i,
  ]);
  const currency = pick(html, [
    /<meta[^>]+property=["']product:price:currency["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:price:currency["'][^>]+content=["']([^"']+)["']/i,
  ]);

  return {
    title,
    description,
    image,
    price: price ? (currency ? `${currency} ${price}` : price) : null,
    source: host || null,
  };
}
