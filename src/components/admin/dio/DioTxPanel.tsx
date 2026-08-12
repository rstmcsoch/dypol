import { useState } from "react";
import { Filter, X } from "lucide-react";
import {
  DIO_TX_LABEL,
  DIO_TX_TYPES,
  useDioAdminTransactions,
  type AdminTx,
  type DioAdminUser,
} from "@/lib/dio";
import { Field, Loading, Modal, Panel, Select, SignedAmount, fmtDateTime } from "./shared";

export function DioTxPanel({
  userFilter,
  onClearUserFilter,
}: {
  userFilter: DioAdminUser | null;
  onClearUserFilter: () => void;
}) {
  const [type, setType] = useState("");
  const [source, setSource] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detail, setDetail] = useState<AdminTx | null>(null);

  const {
    data: txs = [],
    isLoading,
    isFetching,
  } = useDioAdminTransactions({
    userId: userFilter?.user_id ?? null,
    type: type || null,
    source: source.trim() || null,
    minAmount: minAmount ? Math.max(0, Math.floor(Number(minAmount) || 0)) : null,
    from: from ? new Date(`${from}T00:00:00`).toISOString() : null,
    to: to ? new Date(`${to}T23:59:59.999`).toISOString() : null,
  });

  const hasFilters = type || source || minAmount || from || to || userFilter;

  const clear = () => {
    setType("");
    setSource("");
    setMinAmount("");
    setFrom("");
    setTo("");
    onClearUserFilter();
  };

  return (
    <Panel
      title="Dio transaction history"
      kicker="✦ LEDGER"
      actions={
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isFetching && "Refreshing…"}
          {hasFilters ? (
            <button
              onClick={clear}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 font-semibold hover:bg-muted transition"
            >
              <X className="h-3 w-3" /> Clear filters
            </button>
          ) : null}
        </div>
      }
    >
      {userFilter && (
        <div className="flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          <Filter className="h-3.5 w-3.5 text-primary" />
          <span>
            Filtered to <strong>{userFilter.display_name || userFilter.email}</strong>
          </span>
          <button
            onClick={onClearUserFilter}
            className="ml-auto rounded-full p-1 hover:bg-muted"
            title="Show all users"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Select
          label="Type"
          value={type}
          onChange={setType}
          options={[
            { value: "", label: "All types" },
            ...DIO_TX_TYPES.map((t) => ({ value: t, label: DIO_TX_LABEL[t] })),
          ]}
        />
        <Field
          label="Source"
          value={source}
          onChange={setSource}
          placeholder="ad / admin / material…"
        />
        <Field
          label="Min amount"
          value={minAmount}
          onChange={setMinAmount}
          type="number"
          placeholder="0"
        />
        <Field label="From" value={from} onChange={setFrom} type="date" />
        <Field label="To" value={to} onChange={setTo} type="date" />
      </div>

      {isLoading ? (
        <Loading />
      ) : txs.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No transactions match these filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left hidden lg:table-cell">Reason</th>
                <th className="p-3 text-left hidden md:table-cell">By</th>
                <th className="p-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setDetail(t)}
                  className="cursor-pointer border-t border-border transition hover:bg-muted/30"
                  title="View full details"
                >
                  <td className="p-3">
                    <SignedAmount n={t.amount} />
                  </td>
                  <td className="p-3">
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
                      {DIO_TX_LABEL[t.type] ?? t.type}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{t.email ?? t.user_id.slice(0, 8)}</td>
                  <td className="p-3 hidden max-w-[220px] truncate text-muted-foreground lg:table-cell">
                    {t.reason || "—"}
                  </td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">
                    {t.admin_email ?? (t.admin_id ? "admin" : "—")}
                  </td>
                  <td className="p-3 text-right text-xs text-muted-foreground">
                    {fmtDateTime(t.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <Modal title="Transaction details" onClose={() => setDetail(null)}>
          <dl className="grid gap-2 text-sm">
            <DetailRow label="Amount" value={<SignedAmount n={detail.amount} />} />
            <DetailRow
              label="Balance after"
              value={`✦ ${detail.balance_after.toLocaleString()} (was ${detail.balance_before.toLocaleString()})`}
            />
            <DetailRow label="Type" value={DIO_TX_LABEL[detail.type] ?? detail.type} />
            <DetailRow label="Reason" value={detail.reason || "—"} />
            <DetailRow label="Source" value={detail.source} />
            <DetailRow label="User" value={detail.email ?? detail.user_id} mono />
            <DetailRow label="Admin" value={detail.admin_email ?? detail.admin_id ?? "—"} mono />
            <DetailRow
              label="Item"
              value={detail.item_kind ? `${detail.item_kind} · ${detail.item_id}` : "—"}
              mono
            />
            <DetailRow label="Ad offer" value={detail.ad_offer_id ?? "—"} mono />
            <DetailRow label="Reference (idempotency key)" value={detail.reference} mono />
            <DetailRow label="Transaction ID" value={detail.id} mono />
            <DetailRow label="Timestamp" value={fmtDateTime(detail.created_at)} />
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Ledger entries are immutable — the database rejects updates or deletes, so this record
            can never be altered.
          </p>
        </Modal>
      )}
    </Panel>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border px-3 py-2">
      <dt className="shrink-0 text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className={`text-right break-all font-medium ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
