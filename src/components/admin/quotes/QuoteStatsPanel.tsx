import { useMemo } from "react";
import {
  BarChart3,
  CheckCircle2,
  CircleOff,
  History,
  Quote as QuoteIcon,
  CalendarClock,
} from "lucide-react";
import {
  formatInTz,
  safeTimezone,
  useActiveQuotes,
  useQuoteHistory,
  useQuoteSettings,
  useQuotes,
} from "@/lib/daily-quotes";
import { Loading, Section } from "./shared";

export function QuoteStatsPanel() {
  const { data: quotes = [], isLoading } = useQuotes();
  const { data: settings } = useQuoteSettings();
  const { data: active } = useActiveQuotes();
  const { data: history = [] } = useQuoteHistory();

  const tz = safeTimezone(settings?.timezone);

  const stats = useMemo(() => {
    const activeCount = quotes.filter((q) => q.status === "active").length;
    const now = new Date();
    const nextScheduled = quotes
      .filter((q) => q.status === "active" && q.start_at && new Date(q.start_at) > now)
      .sort((a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime())[0];
    return {
      total: quotes.length,
      active: activeCount,
      inactive: quotes.length - activeCount,
      nextScheduled,
    };
  }, [quotes]);

  const quoteById = useMemo(() => new Map(quotes.map((q) => [q.id, q])), [quotes]);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<QuoteIcon className="h-4 w-4" />}
          label="Total quotes"
          value={String(stats.total)}
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Active"
          value={String(stats.active)}
        />
        <StatCard
          icon={<CircleOff className="h-4 w-4" />}
          label="Inactive"
          value={String(stats.inactive)}
        />
        <StatCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Total displays"
          value={String(quotes.reduce((s, q) => s + q.display_count, 0))}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Currently displayed */}
        <Section
          title="Currently displayed"
          hint="Resolved server-side — identical for every visitor"
        >
          {active?.quotes?.length ? (
            <ul className="space-y-2">
              {active.quotes.map((q) => (
                <li key={q.id} className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
                  <div className="text-sm font-medium">“{q.text}”</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {q.author ? `— ${q.author} · ` : ""}source {active.source} · period{" "}
                    {active.period_key}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">Nothing is currently displayed.</p>
          )}
          <div className="rounded-xl border border-border p-3 text-xs text-muted-foreground">
            Next scheduled quote:{" "}
            <span className="font-semibold text-foreground">
              {stats.nextScheduled
                ? `“${stats.nextScheduled.text.slice(0, 50)}…” — starts ${formatInTz(stats.nextScheduled.start_at, tz)}`
                : "none scheduled"}
            </span>
          </div>
        </Section>

        {/* Recent activity */}
        <Section title="Recent displays" hint="Latest rotation history (server-side log)">
          {history.length ? (
            <ul className="space-y-1.5">
              {history.slice(0, 8).map((h) => {
                const q = quoteById.get(h.quote_id);
                return (
                  <li key={h.id} className="flex items-center gap-2 text-xs">
                    <History className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {q
                        ? `“${q.text.slice(0, 55)}${q.text.length > 55 ? "…" : ""}”`
                        : "(deleted quote)"}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatInTz(h.shown_at, tz)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">No displays recorded yet.</p>
          )}
        </Section>
      </div>

      {/* Per-quote table */}
      <Section title="Per-quote statistics" hint={`Times in ${tz}`}>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-xs text-muted-foreground uppercase tracking-widest">
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-3">Quote</th>
                <th className="text-left py-2 pr-3">Status</th>
                <th className="text-right py-2 pr-3">Displayed</th>
                <th className="text-left py-2 pr-3">Last displayed</th>
                <th className="text-left py-2">Next scheduled</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-3 max-w-[260px]">
                    <div className="line-clamp-1 font-medium">“{q.text}”</div>
                    {q.author && (
                      <div className="text-[11px] text-muted-foreground">— {q.author}</div>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        q.status === "active"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {q.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums font-semibold">
                    {q.display_count}×
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                    {formatInTz(q.last_displayed_at, tz, "never")}
                  </td>
                  <td className="py-2.5 text-xs text-muted-foreground">
                    {q.start_at && new Date(q.start_at) > new Date() ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" /> {formatInTz(q.start_at, tz)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border glass p-4">
      <div className="flex items-center gap-2 text-xs tracking-widest text-muted-foreground">
        <span className="text-primary">{icon}</span> {label.toUpperCase()}
      </div>
      <div className="mt-1.5 font-display text-3xl font-black">{value}</div>
    </div>
  );
}
