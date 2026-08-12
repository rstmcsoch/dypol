import { toast } from "sonner";
import { CheckCircle2, Hourglass, Loader2, XCircle } from "lucide-react";
import { usePendingCompletions, useReviewCompletion } from "@/lib/dio";
import { DioStar } from "@/components/dio/DioBits";
import { GoldAmount, Loading, Panel, fmtDateTime } from "./shared";

/** Manual-verification queue: approve to award Dio (idempotent), reject to deny. */
export function DioReviewPanel() {
  const { data: pending = [], isLoading } = usePendingCompletions();
  const review = useReviewCompletion();

  const act = async (id: string, approve: boolean, label: string, reward: number) => {
    if (approve && !confirm(`Award ✦ ${reward} Dio to ${label}?`)) return;
    if (
      !approve &&
      !confirm(
        `Reject this completion request from ${label}? The student can start the activity again afterwards.`,
      )
    )
      return;
    try {
      const res = await review.mutateAsync({ id, approve });
      if (!res.ok) {
        toast.error(`Rejected by server: ${res.error ?? "unknown"}`);
        return;
      }
      toast.success(approve ? `Awarded ✦ ${reward} to ${label}` : `Request rejected`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <Panel title="Pending ad completions" kicker="✦ MANUAL REVIEW">
      <p className="text-xs text-muted-foreground">
        Offers using <em>manual review</em> land here after a student starts them. Approving awards
        the Dio exactly once — re-approvals can never double-credit.
      </p>

      {isLoading ? (
        <Loading />
      ) : pending.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
          <Hourglass className="h-5 w-5" />
          Nothing awaiting review.
        </div>
      ) : (
        <ul className="space-y-2">
          {pending.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border glass px-4 py-3"
            >
              <GoldAmount
                n={p.reward_amount}
                className="shrink-0 rounded-full border border-[#e8b23a]/40 bg-[#e8b23a]/10 px-3 py-1 text-[#e8b23a] text-sm"
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold">{p.offer_title ?? "Sponsored activity"}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {p.email ?? p.user_id} · requested {fmtDateTime(p.created_at)} · ref{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                    {p.reference}
                  </code>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => act(p.id, true, p.email ?? "student", p.reward_amount)}
                  disabled={review.isPending}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#e8b23a]/50 bg-[#e8b23a]/10 px-3.5 py-1.5 text-xs font-semibold text-[#e8b23a] transition hover:bg-[#e8b23a]/15 active:scale-95 disabled:opacity-60"
                >
                  {review.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Approve & award
                </button>
                <button
                  onClick={() => act(p.id, false, p.email ?? "student", p.reward_amount)}
                  disabled={review.isPending}
                  className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-3.5 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10 active:scale-95 disabled:opacity-60"
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <DioStar /> Approved awards flow through the same atomic ledger as automatic postbacks —
        duplicate approvals are safely ignored by the database.
      </p>
    </Panel>
  );
}
