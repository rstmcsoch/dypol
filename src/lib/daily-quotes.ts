import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";

/* ============================ Types ============================ */

export interface Quote {
  id: string;
  text: string;
  author: string;
  category: string;
  status: "active" | "inactive";
  sort_order: number;
  start_at: string | null;
  end_at: string | null;
  display_count: number;
  last_displayed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type DisplayMode = "daily" | "random" | "fixed" | "sequential" | "scheduled";
export type RotationFrequency = "daily" | "12h" | "6h" | "3h" | "1h" | "custom";
export type MultiLayout = "stack" | "steps" | "carousel" | "rotate";
export type AnimationType = "none" | "fade" | "slide" | "scale" | "blur";
export type AnimationSpeed = "slow" | "normal" | "fast" | "custom";
export type CardStyle = "glass" | "solid" | "outline" | "gradient";
export type TextAlign = "left" | "center";
export type QuoteVisibility = "all" | "authenticated" | "admins";

export interface QuoteAppearance {
  show_author: boolean;
  show_category: boolean;
  show_icon: boolean;
  animation_enabled: boolean;
  animation_type: AnimationType | string;
  animation_speed: AnimationSpeed | string;
  animation_duration_ms: number;
  card_style: CardStyle | string;
  text_align: TextAlign | string;
}

export interface QuoteSettings extends QuoteAppearance {
  key: string;
  enabled: boolean;
  visibility: QuoteVisibility | string;
  display_mode: DisplayMode | string;
  quotes_per_day: number;
  multi_layout: MultiLayout | string;
  multi_interval_seconds: number;
  rotation_frequency: RotationFrequency | string;
  custom_interval_minutes: number;
  selection_mode: "random" | "sequential" | string;
  anti_repeat: boolean;
  avoid_last_count: number;
  lock_quote: boolean;
  fixed_quote_id: string | null;
  scheduling_enabled: boolean;
  timezone: string;
  rotation_state: {
    period_key?: string;
    quote_ids?: string[];
    cycle_ids?: string[];
    recent_ids?: string[];
    last_quote_id?: string | null;
    manual_override?: boolean;
    picked_at?: string;
  };
  created_at: string;
  updated_at: string;
}

/** Public quote content returned by get_active_quotes() */
export interface ActiveQuote {
  id: string;
  text: string;
  author: string;
  category: string;
}

export interface ActiveQuotesPayload {
  enabled: boolean;
  reason?: string;
  note?: string;
  source?: string;
  display_mode?: string;
  multi_layout?: MultiLayout | string;
  multi_interval_seconds?: number;
  period_key?: string;
  timezone?: string;
  next_refresh_in_seconds?: number;
  quotes: ActiveQuote[];
  appearance?: QuoteAppearance;
}

export interface QuoteHistoryRow {
  id: string;
  quote_id: string;
  period_key: string;
  mode: string;
  shown_at: string;
}

export type QuoteAction = "set_today" | "set_fixed" | "next" | "prev" | "reset" | "shuffle";

/* ============================ Queries ============================ */

export const activeQuotesQO = queryOptions({
  queryKey: ["dypol_active_quotes"],
  queryFn: async (): Promise<ActiveQuotesPayload> => {
    const { data, error } = await supabase.rpc("get_active_quotes");
    if (error) throw error;
    const payload = (data ?? {}) as unknown as ActiveQuotesPayload;
    return { ...payload, quotes: payload.quotes ?? [] };
  },
  staleTime: 30_000,
  refetchOnWindowFocus: true,
  // Background safety-net poll — the card itself also schedules an exact
  // refetch at the rotation boundary, so quotes update without a page reload.
  refetchInterval: 5 * 60_000,
  retry: 1,
});

export const quotesQO = queryOptions({
  queryKey: ["dypol_quotes"],
  queryFn: async (): Promise<Quote[]> => {
    const { data, error } = await supabase
      .from("daily_quotes")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Quote[];
  },
});

export const quoteSettingsQO = queryOptions({
  queryKey: ["dypol_quote_settings"],
  queryFn: async (): Promise<QuoteSettings> => {
    const { data, error } = await supabase
      .from("quote_settings")
      .select("*")
      .eq("key", "main")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Quote settings row missing — run the daily_quotes migration");
    return data as unknown as QuoteSettings;
  },
});

export const quoteHistoryQO = queryOptions({
  queryKey: ["dypol_quote_history"],
  queryFn: async (): Promise<QuoteHistoryRow[]> => {
    const { data, error } = await supabase
      .from("quote_history")
      .select("*")
      .order("shown_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []) as QuoteHistoryRow[];
  },
});

export function useActiveQuotes() {
  return useQuery(activeQuotesQO);
}
export function useQuotes() {
  return useQuery(quotesQO);
}
export function useQuoteSettings() {
  return useQuery(quoteSettingsQO);
}
export function useQuoteHistory() {
  return useQuery(quoteHistoryQO);
}

/* ============================ Admin mutations ============================ */

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["dypol_quotes"] });
  qc.invalidateQueries({ queryKey: ["dypol_active_quotes"] });
  qc.invalidateQueries({ queryKey: ["dypol_quote_settings"] });
  qc.invalidateQueries({ queryKey: ["dypol_quote_history"] });
}

export function useSaveQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (q: Partial<Quote> & { id?: string }) => {
      if (q.id) {
        const { id, created_at, updated_at, display_count, last_displayed_at, ...rest } = q;
        const { error } = await supabase.from("daily_quotes").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("daily_quotes").insert({
          text: q.text ?? "",
          author: q.author ?? "",
          category: q.category ?? "",
          status: q.status ?? "active",
          sort_order: q.sort_order ?? 100,
          start_at: q.start_at ?? null,
          end_at: q.end_at ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daily_quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

const SETTINGS_COLUMNS = [
  "enabled",
  "visibility",
  "display_mode",
  "quotes_per_day",
  "multi_layout",
  "multi_interval_seconds",
  "rotation_frequency",
  "custom_interval_minutes",
  "selection_mode",
  "anti_repeat",
  "avoid_last_count",
  "lock_quote",
  "fixed_quote_id",
  "scheduling_enabled",
  "timezone",
  "show_author",
  "show_category",
  "show_icon",
  "animation_enabled",
  "animation_type",
  "animation_speed",
  "animation_duration_ms",
  "card_style",
  "text_align",
] as const;

export function useSaveQuoteSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<QuoteSettings>) => {
      const update: TablesUpdate<"quote_settings"> = {};
      for (const k of SETTINGS_COLUMNS) {
        if (k in patch && patch[k] !== undefined) {
          (update as Record<string, unknown>)[k] = patch[k];
        }
      }
      const { error } = await supabase.from("quote_settings").update(update).eq("key", "main");
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/** Server-side manual controls (next / prev / set today / fixed / reset / shuffle). */
export function useQuoteAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ action, quoteId }: { action: QuoteAction; quoteId?: string | null }) => {
      const { data, error } = await supabase.rpc("admin_quote_action", {
        p_action: action,
        p_quote_id: quoteId ?? null,
      });
      if (error) throw error;
      return (data ?? {}) as unknown as ActiveQuotesPayload;
    },
    onSuccess: (payload) => {
      qc.setQueryData(["dypol_active_quotes"], { ...payload, quotes: payload?.quotes ?? [] });
      invalidateAll(qc);
    },
  });
}

/* ============================ Timezone helpers ============================ */

function tzOffsetMs(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) if (p.type !== "literal") parts[p.type] = p.value;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

/** Interpret a `datetime-local` wall time ("YYYY-MM-DDTHH:mm") in `tz` → UTC ISO string. */
export function zonedWallToUtcIso(wall: string, tz: string): string | null {
  if (!wall) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(wall);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  let guess = Date.UTC(y, mo - 1, d, h, mi, 0);
  for (let i = 0; i < 3; i++)
    guess = Date.UTC(y, mo - 1, d, h, mi, 0) - tzOffsetMs(new Date(guess), tz);
  return new Date(guess).toISOString();
}

/** Format a UTC ISO instant as a `datetime-local` wall value in `tz`. */
export function utcIsoToZonedWall(iso: string | null | undefined, tz: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(d)) if (p.type !== "literal") parts[p.type] = p.value;
  return `${parts.year}-${parts.month}-${parts.day}T${String(Number(parts.hour) % 24).padStart(2, "0")}:${parts.minute}`;
}

/** Human-friendly date-time in the given zone (guard for invalid zones). */
export function formatInTz(iso: string | null | undefined, tz: string, fallback = "—"): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

export function safeTimezone(tz: string | undefined | null): string {
  const candidate = (tz || "Asia/Kolkata").trim();
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate });
    return candidate;
  } catch {
    return "UTC";
  }
}

export function supportedTimezones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [
      "UTC",
      "Asia/Kolkata",
      "Asia/Dubai",
      "Europe/London",
      "Europe/Berlin",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "Australia/Sydney",
    ];
  }
}

/* ============================ Animation helpers ============================ */

export function animationDurationMs(a: Partial<QuoteAppearance>): number {
  if (!a.animation_enabled || a.animation_type === "none") return 0;
  if (a.animation_speed === "custom") {
    const ms = Number(a.animation_duration_ms);
    return Number.isFinite(ms) ? Math.min(Math.max(ms, 50), 5000) : 500;
  }
  switch (a.animation_speed) {
    case "slow":
      return 900;
    case "fast":
      return 250;
    default:
      return 500;
  }
}
