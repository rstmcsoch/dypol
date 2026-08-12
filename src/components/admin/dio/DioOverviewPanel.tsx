import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Users,
  Unlock,
  PlayCircle,
  Hourglass,
  Coins,
  Wallet,
} from "lucide-react";
import { useDioStats } from "@/lib/dio";
import { GoldAmount, Panel } from "./shared";

export function DioOverviewPanel({ onGoReview }: { onGoReview: () => void }) {
  const { data: s, isLoading, error } = useDioStats();

  if (isLoading) {
    return (
      <div className="grid min-h-[30vh] place-items-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (error || !s) {
    return (
      <Panel title="Dio overview">
        <p className="text-sm text-muted-foreground">
          Couldn't load stats. Make sure your account has the admin role and the Dio migrations are
          applied.
        </p>
      </Panel>
    );
  }

  const cards = [
    { label: "Dio held by all users", value: s.total_held, icon: Wallet, gold: true },
    { label: "Wallets", value: s.wallets, icon: Users },
    { label: "Distributed today", value: s.earned_today, icon: TrendingUp, gold: true },
    { label: "Distributed this week", value: s.earned_week, icon: TrendingUp },
    { label: "Spent today", value: s.spent_today, icon: TrendingDown },
    { label: "Spent this week", value: s.spent_week, icon: TrendingDown },
    { label: "Material unlocks", value: s.total_unlocks, icon: Unlock },
    { label: "Ad completions", value: s.total_ad_completions, icon: PlayCircle },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-3xl border border-border glass p-5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] tracking-widest text-muted-foreground uppercase">
                {c.label}
              </div>
              <c.icon
                className={`h-4 w-4 ${c.gold ? "text-[#e8b23a]" : "text-muted-foreground"}`}
              />
            </div>
            <div className="mt-2 text-2xl font-black tabular-nums">
              {c.gold ? <GoldAmount n={c.value} /> : c.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {s.pending_ad_completions > 0 && (
        <button
          onClick={onGoReview}
          className="flex w-full items-center justify-between rounded-2xl border border-[#e8b23a]/40 bg-[#e8b23a]/10 px-4 py-3 text-sm font-semibold transition hover:bg-[#e8b23a]/15 active:scale-[0.99]"
        >
          <span className="inline-flex items-center gap-2">
            <Hourglass className="h-4 w-4 text-[#e8b23a]" />
            {s.pending_ad_completions} ad completion{s.pending_ad_completions === 1 ? "" : "s"}{" "}
            awaiting review
          </span>
          <span className="text-[#e8b23a]">Review →</span>
        </button>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Most expensive materials" kicker="✦ PRICING">
          {s.most_expensive.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No paid materials yet. Set a Dio cost in Materials / Portals.
            </p>
          ) : (
            <ul className="space-y-2">
              {s.most_expensive.map((m) => (
                <li
                  key={m.title}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-2 text-sm"
                >
                  <span className="truncate font-medium">{m.title}</span>
                  <GoldAmount n={m.dio_cost} className="shrink-0 text-[#e8b23a]" />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Most unlocked" kicker="✦ POPULAR">
          {s.most_unlocked.length === 0 ? (
            <p className="text-sm text-muted-foreground">No unlocks yet.</p>
          ) : (
            <ul className="space-y-2">
              {s.most_unlocked.map((m) => (
                <li
                  key={m.title}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-2 text-sm"
                >
                  <span className="truncate font-medium">{m.title}</span>
                  <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
                    <Coins className="h-3 w-3" /> {m.unlocks} unlock{m.unlocks === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
