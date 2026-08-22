/**
 * Centralized access-token freshness for the Supabase browser session.
 *
 * How Dypol auth works:
 *  - The browser holds the session in localStorage (@supabase/supabase-js).
 *  - The user's access token is forwarded to TanStack Start server functions
 *    as a Bearer header (see `auth-attacher.ts`, registered globally in
 *    `start.ts`). Server functions are stateless about auth: they only ever
 *    see the access token, never the refresh token, so they CANNOT refresh.
 *    That makes the browser solely responsible for handing the server a
 *    valid, non-expired access token on every call.
 *
 * Why this exists:
 *  - `supabase.auth.getSession()` returns the *cached* session and does NOT
 *    refresh it. The previous attacher/grabbed-token code sent that cached
 *    token straight to the server. Supabase access tokens are short-lived
 *    (~1h). After the token expired (idle/backgrounded tab, sleeping device,
 *    or a page reload that raced the background auto-refresh) the server
 *    received an expired token, rejected it with 401, and the user looked
 *    "logged out" even though the refresh token was still perfectly valid.
 *
 * This module guarantees a fresh token and dedupes concurrent refreshes
 * (single-flight) so that the burst of server-function calls fired after a
 * device wakes up share exactly one refresh — never racing refresh-token
 * rotation.
 */
import { supabase } from "./client";

/** Refresh proactively when the access token has fewer than this many seconds left. */
const REFRESH_BUFFER_SECONDS = 60;

let refreshInFlight: Promise<string | null> | null = null;

function decodeJwtExp(token: string): number | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    // atob exists in every browser context that imports this module
    // (client middleware, ssr:false route guards, client components).
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

/** True when `token` is missing or already inside its expiry buffer. */
export function isAccessTokenExpired(
  token: string | null | undefined,
  bufferSeconds = REFRESH_BUFFER_SECONDS,
): boolean {
  if (!token) return true;
  const exp = decodeJwtExp(token);
  if (exp === null) return false; // can't tell -> let the server validate it
  return Math.floor(Date.now() / 1000) >= exp - bufferSeconds;
}

/**
 * Returns a non-expired access token for the current session, refreshing first
 * when necessary. Resolves to `null` ONLY when there is no session at all, or
 * the refresh token itself is invalid/expired (i.e. the user genuinely must
 * sign in again). Importantly: an *expired access token* is NOT treated as a
 * logout — it is recovered via the refresh token.
 *
 * Concurrent callers share a single in-flight refresh (single-flight) so we
 * never issue overlapping refresh requests that would race refresh-token
 * rotation across simultaneous server-function calls.
 */
export async function ensureFreshAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  const current = session?.access_token ?? null;

  if (!isAccessTokenExpired(current)) {
    return current;
  }

  // No session (or no refresh token) to recover from -> genuinely signed out.
  if (!session?.refresh_token) {
    return null;
  }

  if (!refreshInFlight) {
    refreshInFlight = supabase.auth
      .refreshSession()
      .then(({ data: refreshed, error }) => {
        if (import.meta.env.DEV) {
          // Intentionally logs no token/secret values — only the outcome.
          console.debug("[auth] session refresh", error ? "failed" : "ok");
        }
        if (error || !refreshed.session?.access_token) return null;
        return refreshed.session.access_token;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}
