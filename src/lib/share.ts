import { useSiteSettings, type SiteSettings } from "@/lib/site-api";

/**
 * Share Content — configured in Admin → Site → Share Content and stored on the
 * existing site_settings row (public read, admin-only write via RLS).
 *
 * Every Share button in the app builds its payload from here; nothing else
 * hard-codes share text or URLs. The defaults below only kick in while the
 * settings row hasn't loaded yet (or a field was left blank), and they mirror
 * the database column defaults so behaviour is identical either way.
 */
export const SHARE_DEFAULTS = {
  title: "Dypol",
  message:
    "Check out Dypol — your single launcher for curated study materials, coaching portals, and calm guidance.",
  link: "https://dypol.vercel.app",
  imageUrl: null as string | null,
};

export interface ShareContent {
  title: string;
  message: string;
  link: string;
  imageUrl: string | null;
}

/** Normalize raw settings into a complete share payload (blank → default). */
export function resolveShareContent(s?: Partial<SiteSettings> | null): ShareContent {
  return {
    title: s?.share_title?.trim() || SHARE_DEFAULTS.title,
    message: s?.share_message?.trim() || SHARE_DEFAULTS.message,
    link: s?.share_link?.trim() || SHARE_DEFAULTS.link,
    imageUrl: s?.share_image_url?.trim() || SHARE_DEFAULTS.imageUrl,
  };
}

/** Read the published share configuration (public site_settings row). */
export function useShareContent(): ShareContent {
  const { data } = useSiteSettings();
  return resolveShareContent(data);
}

/** true when v is a well-formed http(s) URL — used to validate Share Link. */
export function isValidHttpUrl(v: string): boolean {
  try {
    const u = new URL(v.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Deep link that pre-fills WhatsApp with the configured share content. */
export function whatsappShareHref(c: ShareContent): string {
  return `https://wa.me/?text=${encodeURIComponent(`${c.title}\n${c.message}\n${c.link}`)}`;
}

/** Deep link that pre-fills Telegram with the configured share content. */
export function telegramShareHref(c: ShareContent): string {
  return `https://t.me/share/url?url=${encodeURIComponent(c.link)}&text=${encodeURIComponent(`${c.title} — ${c.message}`)}`;
}

/** true when the Web Share API (native share sheet) is available. */
export function canUseNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

async function fetchShareImageFile(url: string): Promise<File | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    const ext = blob.type.split("/")[1]?.split("+")[0] || "png";
    return new File([blob], `share.${ext}`, { type: blob.type });
  } catch {
    return null;
  }
}

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

/**
 * Open the platform share sheet (Android intent / Web Share API) with the
 * configured content: { title, text, url } plus the share image as a file when
 * the platform supports file sharing. Falls back to text-only sharing when
 * image files aren't supported, and returns false when the Web Share API is
 * unavailable so callers can degrade gracefully (e.g. copy the link).
 *
 * The receiving app (WhatsApp, Telegram, …) decides how to render the payload;
 * we only hand content to the share intent.
 */
export async function shareViaNavigator(c: ShareContent): Promise<boolean> {
  if (!canUseNativeShare()) return false;

  const payload: ShareData = { title: c.title, text: c.message, url: c.link };

  // Best effort: include the configured image as a file if this browser can share files.
  if (c.imageUrl && typeof navigator.canShare === "function") {
    const file = await fetchShareImageFile(c.imageUrl);
    if (file) {
      const withFile: ShareData = { ...payload, files: [file] };
      if (navigator.canShare(withFile)) {
        try {
          await navigator.share(withFile);
          return true;
        } catch (e) {
          if (isAbort(e)) return true; // user dismissed the sheet — not an error
          // otherwise fall through to text-only share
        }
      }
    }
  }

  try {
    await navigator.share(payload);
    return true;
  } catch (e) {
    return isAbort(e);
  }
}
