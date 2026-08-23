import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ============================== types ============================== */

export type DioTxType =
  | "MATERIAL_UNLOCK"
  | "AD_REWARD"
  | "ADMIN_CREDIT"
  | "ADMIN_DEBIT"
  | "ADMIN_GIFT"
  | "REFUND"
  | "OTHER";

export const DIO_TX_TYPES: DioTxType[] = [
  "MATERIAL_UNLOCK",
  "AD_REWARD",
  "ADMIN_CREDIT",
  "ADMIN_DEBIT",
  "ADMIN_GIFT",
  "REFUND",
  "OTHER",
];

export const DIO_TX_LABEL: Record<DioTxType, string> = {
  MATERIAL_UNLOCK: "Unlock",
  AD_REWARD: "Ad reward",
  ADMIN_CREDIT: "Admin credit",
  ADMIN_DEBIT: "Admin debit",
  ADMIN_GIFT: "Gift",
  REFUND: "Refund",
  OTHER: "Other",
};

export type ItemKind = "material" | "portal";

export interface DioTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: DioTxType;
  reason: string;
  source: string;
  item_kind: string | null;
  item_id: string | null;
  ad_offer_id: string | null;
  admin_id: string | null;
  balance_before: number;
  balance_after: number;
  reference: string;
  created_at: string;
}

export interface Unlock {
  id: string;
  item_kind: ItemKind;
  item_id: string;
  amount_paid: number;
  status: string;
  unlocked_at: string;
}

export interface AdOffer {
  id: string;
  title: string;
  description: string;
  url: string;
  reward_amount: number;
  verification: "postback" | "manual";
  active: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export interface AdCompletion {
  id: string;
  offer_id: string;
  reference: string;
  status: "pending" | "completed" | "rejected";
  reward_amount: number;
  created_at: string;
  completed_at: string | null;
}

export interface UnlockResult {
  ok: boolean;
  already?: boolean;
  error?: string;
  balance?: number;
  needed?: number;
  cost?: number;
  link?: string | null;
}

export const dioKeys = {
  wallet: (uid?: string) => ["dio", "wallet", uid ?? "anon"] as const,
  txs: (uid?: string) => ["dio", "transactions", uid ?? "anon"] as const,
  unlocks: (uid?: string) => ["dio", "unlocks", uid ?? "anon"] as const,
  offers: ["dio", "offers"] as const,
  completions: (uid?: string) => ["dio", "completions", uid ?? "anon"] as const,
  adminStats: ["dio", "admin", "stats"] as const,
};

export function formatDio(n: number) {
  return n.toLocaleString();
}

/* ============================== student reads ============================== */

export const dioWalletQO = (userId: string | undefined) =>
  queryOptions({
    queryKey: dioKeys.wallet(userId),
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from("dio_wallets")
        .select("balance")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data?.balance ?? 0;
    },
  });

export function useDioBalance(userId: string | undefined) {
  return useQuery(dioWalletQO(userId));
}

export function useDioHistory(userId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: [...dioKeys.txs(userId), limit],
    enabled: !!userId,
    queryFn: async (): Promise<DioTransaction[]> => {
      const { data, error } = await supabase
        .from("dio_transactions")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as DioTransaction[];
    },
  });
}

export function useMyUnlocks(userId: string | undefined) {
  return useQuery({
    queryKey: dioKeys.unlocks(userId),
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<Unlock[]> => {
      const { data, error } = await supabase
        .from("material_unlocks")
        .select("id,item_kind,item_id,amount_paid,status,unlocked_at")
        .eq("user_id", userId!)
        .eq("status", "active");
      if (error) throw error;
      return (data ?? []) as Unlock[];
    },
  });
}

export function unlockKey(kind: ItemKind, id: string) {
  return `${kind}:${id}`;
}

export function useUnlockedSet(userId: string | undefined) {
  const { data = [], isLoading } = useMyUnlocks(userId);
  const set = new Set(data.map((u) => unlockKey(u.item_kind, u.item_id)));
  return { set, isLoading };
}

/* ============================== unlock ============================== */

export function useUnlockItem(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { kind: ItemKind; id: string }): Promise<UnlockResult> => {
      const { data, error } = await supabase.rpc("dio_unlock", {
        _item_kind: v.kind,
        _item_id: v.id,
      });
      if (error) throw error;
      return (data ?? { ok: false, error: "UNKNOWN" }) as unknown as UnlockResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dioKeys.wallet(userId) });
      qc.invalidateQueries({ queryKey: dioKeys.unlocks(userId) });
      qc.invalidateQueries({ queryKey: dioKeys.txs(userId) });
      qc.invalidateQueries({ queryKey: ["materials"] });
      qc.invalidateQueries({ queryKey: ["portals"] });
    },
  });
}

/* ============================== earn: ads ============================== */

export function useAdOffers() {
  return useQuery({
    queryKey: dioKeys.offers,
    queryFn: async (): Promise<AdOffer[]> => {
      const { data, error } = await supabase
        .from("dio_ad_offers")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AdOffer[];
    },
  });
}

export function useMyCompletions(userId: string | undefined) {
  return useQuery({
    queryKey: dioKeys.completions(userId),
    enabled: !!userId,
    queryFn: async (): Promise<AdCompletion[]> => {
      const { data, error } = await supabase
        .from("dio_ad_completions")
        .select("id,offer_id,reference,status,reward_amount,created_at,completed_at")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []) as AdCompletion[];
    },
  });
}

export interface AdStartResult {
  ok: boolean;
  error?: string;
  reference?: string;
  status?: string;
  url?: string;
  verification?: "postback" | "manual";
  reward?: number;
}

export function useStartAd(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (offerId: string): Promise<AdStartResult> => {
      const { data, error } = await supabase.rpc("dio_ad_start", { _offer_id: offerId });
      if (error) throw error;
      return (data ?? { ok: false, error: "UNKNOWN" }) as unknown as AdStartResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dioKeys.completions(userId) });
    },
  });
}

/* ============================== admin ============================== */

export interface DioAdminUser {
  user_id: string;
  email: string | null;
  display_name: string | null;
  balance: number;
}

export function useDioAdminUsers(search: string, sort: "asc" | "desc") {
  return useQuery({
    queryKey: ["dio", "admin", "users", search, sort],
    queryFn: async (): Promise<DioAdminUser[]> => {
      const { data, error } = await supabase.rpc("dio_admin_users", {
        _search: search,
        _sort: sort,
        _limit: 100,
      });
      if (error) throw error;
      return (data ?? []) as DioAdminUser[];
    },
  });
}

export interface AdminTx extends DioTransaction {
  email: string | null;
  admin_email: string | null;
}

export interface AdminTxFilters {
  userId?: string | null;
  type?: string | null;
  from?: string | null;
  to?: string | null;
  minAmount?: number | null;
  source?: string | null;
}

export function useDioAdminTransactions(f: AdminTxFilters) {
  return useQuery({
    queryKey: ["dio", "admin", "txs", f],
    queryFn: async (): Promise<AdminTx[]> => {
      const { data, error } = await supabase.rpc("dio_admin_transactions", {
        _user_id: f.userId ?? undefined,
        _type: f.type ?? undefined,
        _from: f.from ?? undefined,
        _to: f.to ?? undefined,
        _min_amount: f.minAmount ?? undefined,
        _source: f.source ?? undefined,
        _limit: 200,
      });
      if (error) throw error;
      return (data ?? []) as AdminTx[];
    },
  });
}

export interface DioStats {
  total_held: number;
  wallets: number;
  earned_today: number;
  earned_week: number;
  spent_today: number;
  spent_week: number;
  total_unlocks: number;
  total_ad_completions: number;
  pending_ad_completions: number;
  most_expensive: { title: string; dio_cost: number }[];
  most_unlocked: { title: string; unlocks: number }[];
  ad_totals: {
    id: string;
    title: string;
    active: boolean;
    reward_amount: number;
    completions: number;
    dio_distributed: number;
  }[];
}

export function useDioStats() {
  return useQuery({
    queryKey: dioKeys.adminStats,
    queryFn: async (): Promise<DioStats> => {
      const { data, error } = await supabase.rpc("dio_admin_stats");
      if (error) throw error;
      return data as unknown as DioStats;
    },
  });
}

export interface AdjustResult {
  ok: boolean;
  error?: string;
  balance?: number;
  duplicate?: boolean;
}

export function useDioAdjust() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      userId: string;
      amount: number;
      type: "ADMIN_CREDIT" | "ADMIN_DEBIT" | "ADMIN_GIFT" | "REFUND" | "OTHER";
      reason: string;
    }): Promise<AdjustResult> => {
      const { data, error } = await supabase.rpc("dio_admin_adjust", {
        _user_id: v.userId,
        _amount: v.amount,
        _type: v.type,
        _reason: v.reason,
      });
      if (error) throw error;
      return (data ?? { ok: false, error: "UNKNOWN" }) as unknown as AdjustResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dio", "admin"] });
      qc.invalidateQueries({ queryKey: ["dio", "wallet"] });
    },
  });
}

export function useSaveAdOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (o: Partial<AdOffer> & { id?: string }) => {
      if (o.id) {
        const { id, created_at, ...rest } = o as AdOffer & { id: string };
        const { error } = await supabase.from("dio_ad_offers").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dio_ad_offers").insert({
          title: o.title ?? "Sponsored activity",
          description: o.description ?? "",
          url: o.url ?? "",
          reward_amount: o.reward_amount ?? 10,
          verification: o.verification ?? "manual",
          active: o.active ?? true,
          sort_order: o.sort_order ?? 100,
          starts_at: o.starts_at ?? null,
          ends_at: o.ends_at ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dioKeys.offers });
      qc.invalidateQueries({ queryKey: dioKeys.adminStats });
    },
  });
}

export function useDeleteAdOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Deactivate instead of destroying history-linked rows.
      const { error } = await supabase.from("dio_ad_offers").update({ active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dioKeys.offers });
      qc.invalidateQueries({ queryKey: dioKeys.adminStats });
    },
  });
}

export interface PendingCompletion {
  id: string;
  user_id: string;
  email: string | null;
  offer_id: string;
  offer_title: string | null;
  reward_amount: number;
  reference: string;
  created_at: string;
}

export function usePendingCompletions() {
  return useQuery({
    queryKey: ["dio", "admin", "pending"],
    queryFn: async (): Promise<PendingCompletion[]> => {
      const { data, error } = await supabase.rpc("dio_admin_pending_completions");
      if (error) throw error;
      return (data ?? []) as PendingCompletion[];
    },
  });
}

export function useReviewCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; approve: boolean }) => {
      const { data, error } = await supabase.rpc("dio_admin_review_completion", {
        _completion_id: v.id,
        _approve: v.approve,
      });
      if (error) throw error;
      return data as unknown as { ok: boolean; error?: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dio", "admin"] });
      qc.invalidateQueries({ queryKey: ["dio", "wallet"] });
    },
  });
}
