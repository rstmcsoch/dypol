import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ============================================================
   Verified active-time tracking.

   Design goals:
   - NO per-second database writes. Time accumulates client-side
     and is flushed in batches.
   - The Page Visibility API pauses counting when the tab is
     hidden; only visible, genuinely-interactive time counts.
   - A session times out automatically after inactivity.
   - The server clamps every delta, so a rogue client cannot
     inflate its own analytics.
   ============================================================ */

const HEARTBEAT_INTERVAL_MS = 30_000; // batch sync every 30s
const FLUSH_MIN_INTERVAL_MS = 20_000;
const TICK_MS = 1_000;
const IDLE_TIMEOUT_MS = 5 * 60_000; // no user input for 5 min -> stop counting
const SESSION_GAP_MS = 30 * 60_000; // away > 30 min -> new session on return
const MAX_PENDING_SECONDS = 600; // clamp client-side too
const STORAGE_KEY = "dypol-activity-session";

interface StoredSession {
  sessionId: string;
  lastActivityAt: number;
  clientId: string;
}

function readStored(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function writeStored(s: StoredSession) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function clearStored() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function clientId(): string {
  try {
    let id = localStorage.getItem("dypol-activity-client");
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("dypol-activity-client", id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

/**
 * Mount once for a signed-in user. Counts verified active seconds and
 * syncs them to the server in batches (never more than every 20s,
 * and only when there is something to report).
 */
export function useActivityTracking(userId: string | undefined) {
  const stateRef = useRef({
    sessionId: null as string | null,
    pending: 0,
    lastFlushAt: 0,
    lastInteractionAt: Date.now(),
    lastActivityAt: Date.now(),
    visible: typeof document === "undefined" ? false : !document.hidden,
    ended: false,
    flushing: false,
    started: false,
    disabled: false, // server refused (e.g. blocked account) — stop retrying
  });

  useEffect(() => {
    if (!userId) return;
    const s = stateRef.current;
    if (s.started) return;
    s.started = true;

    const stored = readStored();
    if (stored && stored.sessionId) {
      s.sessionId = stored.sessionId;
      s.lastActivityAt = stored.lastActivityAt;
    }

    const markInteraction = () => {
      s.lastInteractionAt = Date.now();
      s.lastActivityAt = Date.now();
    };

    const isCounting = () => {
      if (!s.visible) return false;
      if (Date.now() - s.lastInteractionAt > IDLE_TIMEOUT_MS) return false;
      if (Date.now() - s.lastActivityAt > SESSION_GAP_MS) return false;
      return true;
    };

    const beginSession = async () => {
      if (s.disabled) return;
      try {
        const { data } = await supabase.rpc("activity_begin", { _client_id: clientId() });
        if (data) {
          s.sessionId = data as string;
          s.lastActivityAt = Date.now();
          writeStored({ sessionId: data as string, lastActivityAt: Date.now(), clientId: clientId() });
        } else {
          // NULL response: server refused to track (e.g. blocked account).
          s.disabled = true;
          s.pending = 0;
        }
      } catch {
        /* offline — retry on next flush */
      }
    };

    const endSession = async (delta: number) => {
      if (!s.sessionId || s.ended) return;
      s.ended = true;
      clearStored();
      try {
        await supabase.rpc("activity_end", { _session_id: s.sessionId, _delta: Math.min(delta, MAX_PENDING_SECONDS) });
      } catch {
        /* best effort */
      }
    };

    const flush = async () => {
      if (s.flushing || s.disabled) return;
      if (s.pending <= 0) {
        if (!s.sessionId) await beginSession();
        return;
      }
      if (!s.sessionId) await beginSession();
      if (!s.sessionId) return;

      const delta = Math.min(s.pending, MAX_PENDING_SECONDS);
      s.pending -= delta;
      s.lastFlushAt = Date.now();
      s.flushing = true;
      try {
        await supabase.rpc("activity_heartbeat", { _session_id: s.sessionId, _delta: delta });
      } catch {
        s.pending += delta; // keep the seconds for the next batch
      } finally {
        s.flushing = false;
      }
    };

    // If the user is returning after a long gap, start a fresh session.
    const ensureSession = () => {
      if (!s.sessionId) {
        void beginSession();
        return;
      }
      if (Date.now() - s.lastActivityAt > SESSION_GAP_MS) {
        void endSession(0).then(() => {
          s.sessionId = null;
          s.ended = false;
          void beginSession();
        });
      }
    };

    const onVisibilityChange = () => {
      const visible = !document.hidden;
      s.visible = visible;
      if (visible) {
        s.lastInteractionAt = Date.now();
        s.lastActivityAt = Date.now();
        s.ended = false;
        s.disabled = false; // account may have been unblocked — retry once
        ensureSession();
      } else {
        // Stop counting immediately and sync what we have.
        void flush();
      }
    };

    const onPageHide = () => {
      // Last chance to sync — fire and forget.
      if (s.pending > 0 && s.sessionId) {
        const delta = Math.min(s.pending, MAX_PENDING_SECONDS);
        s.pending -= delta;
        void supabase
          .rpc("activity_heartbeat", { _session_id: s.sessionId, _delta: delta })
          .then(undefined, () => {});
      }
    };

    const tick = () => {
      if (!s.visible) return;
      if (isCounting()) {
        s.pending += 1;
        s.lastActivityAt = Date.now();
      }
      if (s.pending > 0 && Date.now() - s.lastFlushAt >= FLUSH_MIN_INTERVAL_MS) {
        void flush();
      }
    };

    // Coarse listeners — throttled so typing/scrolling can't spam the counters.
    const interact = () => {
      const now = Date.now();
      if (now - s.lastInteractionAt < 10_000) return;
      markInteraction();
    };

    window.addEventListener("pointerdown", interact, { passive: true });
    window.addEventListener("keydown", interact, { passive: true });
    window.addEventListener("scroll", interact, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    const interval = window.setInterval(tick, TICK_MS);
    const heartbeat = window.setInterval(flush, HEARTBEAT_INTERVAL_MS);

    ensureSession();
    markInteraction();

    return () => {
      window.clearInterval(interval);
      window.clearInterval(heartbeat);
      window.removeEventListener("pointerdown", interact);
      window.removeEventListener("keydown", interact);
      window.removeEventListener("scroll", interact);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      s.started = false;
      // Leave the session open (may return within the gap window).
      if (s.pending > 0) void flush();
    };
  }, [userId]);
}
