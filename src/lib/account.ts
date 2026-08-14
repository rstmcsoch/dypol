import { createServerFn } from "@tanstack/react-start";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ============================================================
   Account state (onboarding + blocking) used by the root
   navigation guard. The database is the authority; the cache
   below only prevents a profile round-trip on every navigation.
   ============================================================ */

export interface AccountState {
  completed: boolean; // mandatory exam + year onboarding done
  blocked: boolean; // permanently blocked OR inside a temp block window
  permanent: boolean;
  blockedUntil: string | null;
  blockReason: string;
  exam: string | null;
  year: number | null;
}

interface CachedState {
  uid: string;
  at: number;
  promise: Promise<AccountState>;
}

const CACHE_TTL_MS = 30_000;
let cache: CachedState | null = null;

async function fetchAccountState(uid: string): Promise<AccountState> {
  const { data, error } = await supabase
    .from("profiles")
    .select("account_status, blocked_until, block_reason, onboarding_completed_at, selected_exam, preparation_year")
    .eq("id", uid)
    .maybeSingle();
  if (error) throw error;

  const blockedUntil = data?.blocked_until ?? null;
  const blockedNow =
    data?.account_status === "blocked" || (blockedUntil !== null && new Date(blockedUntil).getTime() > Date.now());

  return {
    completed: !!data?.onboarding_completed_at && !!data?.selected_exam && data.preparation_year != null,
    blocked: blockedNow,
    permanent: data?.account_status === "blocked",
    blockedUntil: blockedNow ? blockedUntil : null,
    blockReason: data?.block_reason ?? "",
    exam: data?.selected_exam ?? null,
    year: data?.preparation_year ?? null,
  };
}

/** Shared, TTL-cached account state. One DB request per user per 30s max. */
export function getAccountState(uid: string, force = false): Promise<AccountState> {
  if (!cache || cache.uid !== uid || Date.now() - cache.at > CACHE_TTL_MS || force) {
    cache = { uid, at: Date.now(), promise: fetchAccountState(uid) };
  }
  return cache.promise;
}

export function invalidateAccountState(uid?: string) {
  if (!cache) return;
  if (!uid || cache.uid === uid) cache = null;
}

/* ============================================================
   Onboarding
   ============================================================ */

export interface OnboardingExam {
  slug: string;
  name: string;
  years: number[];
}

export interface OnboardingOptionsResult {
  ok: boolean;
  error?: string;
  exams: OnboardingExam[];
}

export async function fetchOnboardingOptions(): Promise<OnboardingOptionsResult> {
  const { data, error } = await supabase.rpc("get_onboarding_options");
  if (error) throw error;
  const out = (data ?? { ok: false, error: "UNKNOWN" }) as unknown as OnboardingOptionsResult;
  return out;
}

export const onboardingOptionsQO = queryOptions({
  queryKey: ["onboarding", "options"],
  staleTime: 60_000,
  queryFn: fetchOnboardingOptions,
});

export function useOnboardingOptions() {
  return useQuery(onboardingOptionsQO);
}

export interface OnboardingResult {
  ok: boolean;
  error?: string;
}

export async function submitOnboarding(examSlug: string, year: number): Promise<OnboardingResult> {
  const { data, error } = await supabase.rpc("complete_onboarding", {
    _exam_slug: examSlug,
    _year: year,
  });
  if (error) throw error;
  return (data ?? { ok: false, error: "UNKNOWN" }) as unknown as OnboardingResult;
}

/* ============================================================
   Admin blocking (server-side enforcement + best-effort
   session revocation when a service-role key is available)
   ============================================================ */

export type BlockAction = "block" | "temp_block" | "unblock";

export interface BlockInput {
  userId: string;
  action: BlockAction;
  durationHours?: number;
  reason?: string;
  startAt?: string; // ISO; defaults to now
}

export interface BlockResult {
  ok: boolean;
  error?: string;
}

export const adminSetBlock = createServerFn({ method: "POST" })
  .validator((d: BlockInput): BlockInput => {
    if (!d || typeof d.userId !== "string" || !d.userId) throw new Error("User id required");
    if (d.action !== "block" && d.action !== "temp_block" && d.action !== "unblock") {
      throw new Error("Invalid block action");
    }
    if (d.action === "temp_block") {
      const hours = Number(d.durationHours);
      if (!Number.isFinite(hours) || hours < 1 || hours > 8760) {
        throw new Error("Duration must be between 1 hour and 1 year");
      }
    }
    const reason = typeof d.reason === "string" ? d.reason.trim().slice(0, 500) : "";
    return {
      userId: d.userId,
      action: d.action,
      durationHours: d.action === "temp_block" ? Math.floor(Number(d.durationHours)) : undefined,
      reason,
      startAt: typeof d.startAt === "string" && d.startAt ? d.startAt : undefined,
    };
  })
  .handler(async ({ data }): Promise<BlockResult> => {
    const { requireAdminClientFromRequest } = await import("./admin-guard.server");
    const { supabase } = await requireAdminClientFromRequest();

    // 1) Authoritative DB change (security-definer RPC, admin-verified).
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_block_user", {
      _user_id: data.userId,
      _action: data.action,
      _duration_hours: data.durationHours ?? null,
      _reason: data.reason ?? "",
      _start_at: data.startAt ?? null,
    });
    if (rpcError) throw rpcError;
    const res = (rpcData ?? { ok: false, error: "UNKNOWN" }) as unknown as BlockResult;
    if (!res.ok) return res;

    // 2) Best-effort session revocation through the auth admin API
    //    (only available when a service-role key is configured).
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      if (data.action === "unblock") {
        await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: "none" });
      } else {
        const ban = data.action === "temp_block" ? `${data.durationHours}h` : "876600h";
        await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: ban });
      }
    } catch {
      // Service role unavailable in this environment: DB-side enforcement
      // (RLS + RPC block checks) still applies.
    }

    return res;
  });
