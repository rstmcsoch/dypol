import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ============================================================
   Admin user-management queries. Everything is executed by
   security-definer RPCs that verify the admin role server-side,
   and all filtering/sorting/pagination happens in the database.
   ============================================================ */

export type UserStatusFilter = "" | "active" | "blocked" | "temp_blocked" | "onboarding";

export type UserSort =
  | "newest"
  | "oldest"
  | "approved_desc"
  | "approved_asc"
  | "total_desc"
  | "total_asc"
  | "active_desc"
  | "active_asc"
  | "sessions_desc"
  | "sessions_asc"
  | "recent"
  | "stale";

export interface AdminUserFilters {
  search: string;
  exam: string; // exam slug or ""
  status: UserStatusFilter;
  sort: UserSort;
  minApproved: number | null;
  page: number;
  pageSize: number;
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  selected_exam: string | null;
  preparation_year: number | null;
  account_status: string;
  blocked_at: string | null;
  blocked_until: string | null;
  block_reason: string;
  created_at: string;
  last_active_at: string | null;
  total_active_seconds: number;
  total_sessions: number;
  avg_session_seconds: number;
  dio_balance: number;
  total_submissions: number;
  approved_submissions: number;
  rejected_submissions: number;
  pending_submissions: number;
  is_blocked: boolean;
  needs_onboarding: boolean;
}

export interface AdminUsersPage {
  total: number;
  page: number;
  pageSize: number;
  users: AdminUserRow[];
}

export const adminUsersQO = (f: AdminUserFilters) =>
  queryOptions({
    queryKey: ["admin", "users", f],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<AdminUsersPage> => {
      const { data, error } = await supabase.rpc("admin_list_users", {
        _search: f.search,
        _exam: f.exam,
        _status: f.status,
        _sort: f.sort,
        _min_approved: f.minApproved ?? undefined,
        _page: f.page,
        _page_size: f.pageSize,
      });
      if (error) throw error;
      const out = (data ?? {}) as unknown as { ok?: boolean; total?: number; page?: number; page_size?: number; users?: unknown };
      if (!out.total && out.total !== 0) throw new Error("Invalid response from server");
      return {
        total: out.total ?? 0,
        page: out.page ?? f.page,
        pageSize: out.page_size ?? f.pageSize,
        users: (out.users ?? []) as AdminUserRow[],
      };
    },
  });

export function useAdminUsers(f: AdminUserFilters) {
  return useQuery(adminUsersQO(f));
}

/* ---------------- detail ---------------- */

export interface AdminUserDetail {
  ok: boolean;
  profile: {
    id: string;
    email: string | null;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    selected_exam: string | null;
    preparation_year: number | null;
    account_status: string;
    blocked_at: string | null;
    blocked_until: string | null;
    block_reason: string;
    blocked_by: string | null;
    created_at: string;
    updated_at: string;
    last_active_at: string | null;
    total_active_seconds: number;
    total_sessions: number;
    onboarding_completed_at: string | null;
  };
  dio_balance: number;
  submissions: { total: number; approved: number; rejected: number; pending: number };
  recent_submissions: { id: string; name: string; kind: string; status: string; created_at: string }[];
  unlocks_count: number;
  bookmarks_count: number;
  recent_sessions: { id: string; started_at: string; ended_at: string | null; active_seconds: number }[];
  avg_session_seconds: number;
}

export const adminUserProfileQO = (userId: string | null) =>
  queryOptions({
    queryKey: ["admin", "user_profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<AdminUserDetail> => {
      const { data, error } = await supabase.rpc("admin_user_profile", { _user_id: userId! });
      if (error) throw error;
      return data as unknown as AdminUserDetail;
    },
  });

export function useAdminUserProfile(userId: string | null) {
  return useQuery(adminUserProfileQO(userId));
}

/* ---------------- formatting helpers ---------------- */

export function formatActiveTime(seconds: number): string {
  if (!seconds || seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
