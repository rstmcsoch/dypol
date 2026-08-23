import { resolve4, resolve6 } from "node:dns/promises";
import { request as httpRequest, type IncomingHttpHeaders } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

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

const BAD_IMAGE =
  /(logo|sprite|placeholder|icon|favicon|nav-|transparent-pixel|grey-pixel|1x1|blank|banner|amazon-?ads|default[-_]?image)/i;

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
    const urls = [
      ...decode(dyn[1]).matchAll(/(https?:\\?\/\\?\/[^"'\\]+?\.(?:jpg|jpeg|png|webp))/gi),
    ].map((m) => m[1]!.replace(/\\\//g, "/"));
    const found = urls.find(isLikelyProductImage);
    if (found) return found;
  }
  const keyed = [
    ...html.matchAll(
      /"(?:hiRes|large|mainUrl|main)"\s*:\s*"(https?:[^"]+?\.(?:jpg|jpeg|png|webp))"/gi,
    ),
  ].map((m) => m[1]!.replace(/\\\//g, "/"));
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
  const blocks = [
    ...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi),
  ];
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
      const cand = srcset
        .split(",")
        .map((s) => s.trim().split(/\s+/)[0]!)
        .find(isLikelyProductImage);
      if (cand) return cand;
    }
  }
  return null;
}

const MAX_REDIRECTS = 4;
const MAX_RESPONSE_BYTES = 2_000_000;
const REQUEST_TIMEOUT_MS = 10_000;

function ipv4Parts(value: string): number[] | null {
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const out = parts.map((part) => (/^\d{1,3}$/.test(part) ? Number(part) : Number.NaN));
  return out.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) ? out : null;
}

function isPublicIpv4(value: string): boolean {
  const parts = ipv4Parts(value);
  if (!parts) return false;
  const [a, b, c] = parts as [number, number, number, number];

  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
  if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

function ipv6ToBigInt(value: string): bigint | null {
  const normalized = value
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .split("%")[0]!;
  if (!normalized || normalized.split("::").length > 2) return null;

  const expandSide = (side: string): string[] => {
    if (!side) return [];
    const tokens = side.split(":");
    const last = tokens.at(-1);
    if (last?.includes(".")) {
      const v4 = ipv4Parts(last);
      if (!v4) return ["invalid"];
      tokens.splice(
        -1,
        1,
        ((v4[0]! << 8) | v4[1]!).toString(16),
        ((v4[2]! << 8) | v4[3]!).toString(16),
      );
    }
    return tokens;
  };

  const [leftRaw, rightRaw] = normalized.split("::");
  const left = expandSide(leftRaw ?? "");
  const right = expandSide(rightRaw ?? "");
  const hasCompression = normalized.includes("::");
  const missing = 8 - left.length - right.length;
  if ((!hasCompression && missing !== 0) || (hasCompression && missing < 1)) return null;
  const groups = [...left, ...Array.from({ length: missing }, () => "0"), ...right];
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;

  return groups.reduce((acc, group) => (acc << 16n) | BigInt(`0x${group}`), 0n);
}

export function isPublicIpAddress(address: string): boolean {
  const version = isIP(address.replace(/^\[|\]$/g, ""));
  if (version === 4) return isPublicIpv4(address);
  if (version !== 6) return false;

  const value = ipv6ToBigInt(address);
  if (value === null || value === 0n || value === 1n) return false;

  // IPv4-mapped IPv6. Apply the IPv4 rules to the embedded address.
  if (value >> 32n === 0xffffn) {
    const v4 = Number(value & 0xffffffffn);
    return isPublicIpv4(
      `${(v4 >>> 24) & 255}.${(v4 >>> 16) & 255}.${(v4 >>> 8) & 255}.${v4 & 255}`,
    );
  }

  // Only current global-unicast space (2000::/3), excluding transition and
  // documentation ranges, is appropriate for an outbound metadata fetch.
  if (value >> 125n !== 1n) return false;
  if (value >> 96n === 0x20010000n) return false; // Teredo 2001:0000::/32
  if (value >> 96n === 0x20010db8n) return false; // Documentation 2001:db8::/32
  if (value >> 112n === 0x2002n) return false; // 6to4 transition range
  return true;
}

/** Reject credentials, unsafe schemes/ports, and known local hostnames. */
export function parsePublicHttpUrl(target: string): URL {
  let u: URL;
  try {
    u = new URL(target);
  } catch {
    throw new Error("Invalid URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:")
    throw new Error("Only http(s) URLs are allowed");
  if (u.username || u.password) throw new Error("URL credentials are not allowed");
  if (
    u.port &&
    !((u.protocol === "http:" && u.port === "80") || (u.protocol === "https:" && u.port === "443"))
  ) {
    throw new Error("Only standard web ports are allowed");
  }

  const host = u.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal"
  ) {
    throw new Error("Target host is not allowed");
  }
  if (isIP(host) && !isPublicIpAddress(host)) throw new Error("Target host is not allowed");
  return u;
}

async function resolvePublicAddress(url: URL): Promise<{ address: string; family: 4 | 6 }> {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const literalFamily = isIP(host);
  if (literalFamily) {
    if (!isPublicIpAddress(host)) throw new Error("Target host is not allowed");
    return { address: host, family: literalFamily as 4 | 6 };
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const outcomes = await Promise.race([
    Promise.allSettled([resolve4(host), resolve6(host)]),
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("Target DNS lookup timed out")),
        REQUEST_TIMEOUT_MS,
      );
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });

  const addresses: Array<{ address: string; family: 4 | 6 }> = [];
  if (outcomes[0].status === "fulfilled") {
    addresses.push(...outcomes[0].value.map((address) => ({ address, family: 4 as const })));
  }
  if (outcomes[1].status === "fulfilled") {
    addresses.push(...outcomes[1].value.map((address) => ({ address, family: 6 as const })));
  }
  if (!addresses.length || addresses.some((entry) => !isPublicIpAddress(entry.address))) {
    throw new Error("Target host resolves to a non-public address");
  }
  const selected = addresses[0]!;
  return { address: selected.address, family: selected.family as 4 | 6 };
}

interface PageResponse {
  status: number;
  headers: IncomingHttpHeaders;
  body: string;
}

async function requestPage(url: URL): Promise<PageResponse> {
  const resolved = await resolvePublicAddress(url);
  const request = url.protocol === "https:" ? httpsRequest : httpRequest;

  return await new Promise<PageResponse>((resolve, reject) => {
    const req = request(
      url,
      {
        method: "GET",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8",
          "accept-language": "en-US,en;q=0.9",
        },
        maxHeaderSize: 32 * 1024,
        family: resolved.family,
        lookup: (_hostname, _options, callback) => {
          callback(null, resolved.address, resolved.family);
        },
      },
      async (res) => {
        try {
          const status = res.statusCode ?? 0;
          if ([301, 302, 303, 307, 308].includes(status)) {
            res.resume();
            resolve({ status, headers: res.headers, body: "" });
            return;
          }

          const contentType = String(res.headers["content-type"] ?? "").toLowerCase();
          if (
            contentType &&
            !contentType.startsWith("text/html") &&
            !contentType.startsWith("application/xhtml+xml") &&
            !contentType.startsWith("text/plain") &&
            !contentType.startsWith("application/xml")
          ) {
            res.resume();
            reject(new Error("Target did not return an HTML page"));
            return;
          }

          const declaredLength = Number(res.headers["content-length"] ?? 0);
          if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
            res.resume();
            reject(new Error("Target response is too large"));
            return;
          }

          const chunks: Buffer[] = [];
          let total = 0;
          for await (const chunk of res) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            total += buffer.length;
            if (total > MAX_RESPONSE_BYTES) throw new Error("Target response is too large");
            chunks.push(buffer);
          }
          resolve({ status, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") });
        } catch (error) {
          reject(error);
        }
      },
    );

    req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error("Target request timed out")));
    req.on("error", reject);
    req.end();
  });
}

async function fetchPublicHtml(target: string): Promise<{ html: string; finalUrl: string }> {
  let current = parsePublicHttpUrl(target);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await requestPage(current);
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = Array.isArray(response.headers.location)
        ? response.headers.location[0]
        : response.headers.location;
      if (!location) throw new Error("Target returned an invalid redirect");
      if (redirect === MAX_REDIRECTS) throw new Error("Target redirected too many times");
      current = parsePublicHttpUrl(new URL(location, current).toString());
      continue;
    }
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Fetch failed: HTTP ${response.status}`);
    }
    return { html: response.body, finalUrl: current.toString() };
  }
  throw new Error("Target redirected too many times");
}

export async function fetchLinkMeta(target: string): Promise<FetchedMetaResult> {
  let fetched: { html: string; finalUrl: string };
  try {
    fetched = await fetchPublicHtml(target);
  } catch (e) {
    throw new Error(`Fetch failed: ${(e as Error).message}`);
  }
  const html = fetched.html;
  const base = fetched.finalUrl;
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
