import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Gift, HandCoins, Loader2, MinusCircle, Search } from "lucide-react";
import { useDioAdminUsers, useDioAdjust, type DioAdminUser } from "@/lib/dio";
import { DioStar } from "@/components/dio/DioBits";
import {
  Field,
  GoldAmount,
  Loading,
  Modal,
  Panel,
  Select,
  dangerBtn,
  ghostBtn,
  primaryBtn,
} from "./shared";

type AdjustMode = "ADMIN_CREDIT" | "ADMIN_DEBIT" | "ADMIN_GIFT";

const MODE_LABEL: Record<AdjustMode, string> = {
  ADMIN_CREDIT: "Credit Dio",
  ADMIN_DEBIT: "Debit Dio",
  ADMIN_GIFT: "Gift Dio",
};

export function DioUsersPanel({
  onViewTransactions,
}: {
  onViewTransactions: (u: DioAdminUser) => void;
}) {
  const [raw, setRaw] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [adjust, setAdjust] = useState<{ user: DioAdminUser; mode: AdjustMode } | null>(null);

  // Debounce the search so typing doesn't spam the RPC.
  useEffect(() => {
    const t = setTimeout(() => setSearch(raw.trim()), 300);
    return () => clearTimeout(t);
  }, [raw]);

  const { data: users = [], isLoading, isFetching } = useDioAdminUsers(search, sort);

  return (
    <Panel
      title="User Dio management"
      kicker="✦ STUDENTS"
      actions={
        <div className="text-xs text-muted-foreground">
          {isFetching ? "Refreshing…" : `${users.length} shown`}
        </div>
      }
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-xl border border-border bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-primary transition"
          />
        </div>
        <Select
          label="Rank by balance"
          value={sort}
          onChange={(v) => setSort(v as "asc" | "desc")}
          options={[
            { value: "desc", label: "Highest Dio first" },
            { value: "asc", label: "Lowest Dio first" },
          ]}
        />
      </div>

      {isLoading ? (
        <Loading />
      ) : users.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No users match "{search}".</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="p-3 text-left w-12">Rank</th>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-right">Dio</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.user_id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 font-bold text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="p-3 font-semibold">{u.display_name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3 text-right">
                    <GoldAmount n={u.balance} className="text-[#e8b23a]" />
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1 flex-wrap">
                      <button
                        onClick={() => setAdjust({ user: u, mode: "ADMIN_CREDIT" })}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition hover:bg-primary/10 hover:text-primary"
                        title="Credit Dio"
                      >
                        <HandCoins className="mr-1 inline h-3.5 w-3.5" />
                        Credit
                      </button>
                      <button
                        onClick={() => setAdjust({ user: u, mode: "ADMIN_DEBIT" })}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition hover:bg-destructive/10 hover:text-destructive"
                        title="Debit Dio"
                      >
                        <MinusCircle className="mr-1 inline h-3.5 w-3.5" />
                        Debit
                      </button>
                      <button
                        onClick={() => setAdjust({ user: u, mode: "ADMIN_GIFT" })}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition hover:bg-[#e8b23a]/10 hover:text-[#e8b23a]"
                        title="Gift Dio"
                      >
                        <Gift className="mr-1 inline h-3.5 w-3.5" />
                        Gift
                      </button>
                      <button
                        onClick={() => onViewTransactions(u)}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition hover:bg-muted"
                        title="View this user's transactions"
                      >
                        History
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adjust && (
        <AdjustModal user={adjust.user} mode={adjust.mode} onClose={() => setAdjust(null)} />
      )}
    </Panel>
  );
}

function AdjustModal({
  user,
  mode,
  onClose,
}: {
  user: DioAdminUser;
  mode: AdjustMode;
  onClose: () => void;
}) {
  const [amountStr, setAmountStr] = useState("");
  const [reason, setReason] = useState("");
  const adjust = useDioAdjust();

  const amount = useMemo(() => {
    const n = Number(amountStr);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }, [amountStr]);

  const after = mode === "ADMIN_DEBIT" ? user.balance - amount : user.balance + amount;
  const wouldGoNegative = after < 0;
  const valid = amount > 0 && !wouldGoNegative;

  const confirm = async () => {
    try {
      const res = await adjust.mutateAsync({
        userId: user.user_id,
        amount,
        type: mode,
        reason: reason.trim() || MODE_LABEL[mode],
      });
      if (!res.ok) {
        if (res.error === "INSUFFICIENT_DIO") {
          toast.error("Server rejected: the balance would go negative. Nothing was deducted.");
        } else if (res.error === "FORBIDDEN") {
          toast.error("Your session is not recognized as admin by the server.");
        } else {
          toast.error(`Rejected: ${res.error ?? "unknown error"}. Balance unchanged.`);
        }
        return;
      }
      toast.success(
        `${MODE_LABEL[mode]} applied — new balance for ${user.display_name || user.email}: ✦ ${(res.balance ?? after).toLocaleString()}`,
      );
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed. Balance unchanged.");
    }
  };

  return (
    <Modal
      title={`${MODE_LABEL[mode]} — ${user.display_name || user.email || "student"}`}
      onClose={onClose}
    >
      <div className="grid gap-3">
        <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3 text-sm">
          <span className="text-muted-foreground">Current balance</span>
          <GoldAmount n={user.balance} className="text-[#e8b23a]" />
        </div>

        <Field
          label="Amount"
          value={amountStr}
          onChange={setAmountStr}
          placeholder="e.g. 100"
          type="number"
        />
        <Field
          label="Reason (recorded in the ledger)"
          value={reason}
          onChange={setReason}
          placeholder={
            mode === "ADMIN_GIFT"
              ? "e.g. Competition reward"
              : mode === "ADMIN_DEBIT"
                ? "e.g. Manual correction"
                : "e.g. Bonus credit"
          }
        />

        <div
          className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${
            wouldGoNegative
              ? "border-destructive/50 bg-destructive/5"
              : "border-[#e8b23a]/40 bg-[#e8b23a]/5"
          }`}
        >
          <span className="text-muted-foreground">
            After {mode === "ADMIN_DEBIT" ? "debit" : mode === "ADMIN_GIFT" ? "gift" : "credit"}
          </span>
          <span className="inline-flex items-center gap-1 font-bold tabular-nums">
            <DioStar /> {after.toLocaleString()}
          </span>
        </div>
        {wouldGoNegative && (
          <p className="text-xs text-destructive">
            This would make the balance negative. Negative balances are disabled — the server will
            reject it.
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          This creates a permanent, immutable transaction record with your admin identity, the
          reason and before/after balances.
        </p>

        <div className="mt-1 flex justify-end gap-2">
          <button onClick={onClose} className={ghostBtn}>
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={!valid || adjust.isPending}
            className={mode === "ADMIN_DEBIT" ? dangerBtn : primaryBtn}
          >
            {adjust.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <DioStar />}
            Confirm {MODE_LABEL[mode].toLowerCase()}
          </button>
        </div>
      </div>
    </Modal>
  );
}
