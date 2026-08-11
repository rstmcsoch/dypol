import { useMemo, useState } from "react";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  addDays,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatInTz,
  safeTimezone,
  useQuoteSettings,
  useQuotes,
  type Quote,
} from "@/lib/daily-quotes";
import { Loading, Section } from "./shared";

/** Does quote q have any window overlap with calendar day `day` in timezone tz? */
function overlapsDay(q: Quote, day: Date): boolean {
  if (!q.start_at && !q.end_at) return false;
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
  const start = q.start_at ? new Date(q.start_at) : null;
  const end = q.end_at ? new Date(q.end_at) : null;
  if (start && end) return start <= dayEnd && end >= dayStart;
  if (start) return start <= dayEnd;
  if (end) return end >= dayStart;
  return false;
}

export function QuoteSchedulePanel() {
  const { data: quotes = [], isLoading } = useQuotes();
  const { data: settings } = useQuoteSettings();
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState<Date>(() => new Date());

  const tz = safeTimezone(settings?.timezone);

  const scheduled = useMemo(() => quotes.filter((q) => q.start_at || q.end_at), [quotes]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [month]);

  const quotesForDay = (day: Date) => scheduled.filter((q) => overlapsDay(q, day));
  const selectedQuotes = quotesForDay(selected);

  const upcoming = useMemo(() => {
    const now = new Date();
    return [...scheduled]
      .filter((q) => (q.end_at ? new Date(q.end_at) >= now : true) && (q.start_at ? true : true))
      .sort((a, b) => new Date(a.start_at ?? 0).getTime() - new Date(b.start_at ?? 0).getTime())
      .slice(0, 12);
  }, [scheduled]);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-5">
      {!settings?.scheduling_enabled && settings?.display_mode !== "scheduled" && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          Scheduling is currently <strong>OFF</strong>. Enable it in{" "}
          <strong>Settings → Scheduling</strong>, or switch the display mode to{" "}
          <strong>Scheduled windows</strong>. Times below are shown in <strong>{tz}</strong>.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        {/* ---------------- Calendar ---------------- */}
        <Section
          title="Schedule calendar"
          hint={`Days containing scheduled quotes · timezone ${tz}`}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => setMonth((m) => addMonths(m, -1))}
              className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="font-display font-bold">{format(month, "MMMM yyyy")}</div>
            <button
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] tracking-widest text-muted-foreground">
            {["MO", "TU", "WE", "TH", "FR", "SA", "SU"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const hits = quotesForDay(day);
              const isToday = isSameDay(day, new Date());
              const isSel = isSameDay(day, selected);
              const inMonth = isSameMonth(day, month);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelected(day)}
                  className={`relative aspect-square rounded-xl border text-xs transition grid place-items-center ${
                    isSel
                      ? "gradient-primary text-primary-foreground border-transparent font-bold"
                      : isToday
                        ? "border-primary/50 font-bold text-primary"
                        : inMonth
                          ? "border-border hover:bg-muted"
                          : "border-transparent text-muted-foreground/40"
                  }`}
                >
                  {format(day, "d")}
                  {hits.length > 0 && (
                    <span className={`absolute bottom-1 flex gap-0.5 ${isSel ? "" : ""}`}>
                      {hits.slice(0, 3).map((h) => (
                        <span
                          key={h.id}
                          className={`h-1 w-1 rounded-full ${isSel ? "bg-primary-foreground" : "bg-primary"}`}
                        />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* selected day details */}
          <div className="rounded-xl border border-border p-3">
            <div className="text-xs tracking-widest text-muted-foreground">
              {format(selected, "EEEE, d MMMM yyyy").toUpperCase()}
            </div>
            {selectedQuotes.length ? (
              <ul className="mt-2 space-y-2">
                {selectedQuotes.map((q) => (
                  <li key={q.id} className="text-sm">
                    <span className="font-medium">
                      “{q.text.slice(0, 70)}
                      {q.text.length > 70 ? "…" : ""}”
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {q.start_at ? `from ${formatInTz(q.start_at, tz)}` : "from beginning"}
                      {" · "}
                      {q.end_at ? `until ${formatInTz(q.end_at, tz)}` : "no end"}
                      {q.status === "inactive" && " · inactive"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground italic">
                No scheduled quote windows cover this day.
              </p>
            )}
          </div>
        </Section>

        {/* ---------------- Upcoming list ---------------- */}
        <Section title="Scheduled quotes" hint="Quotes with a start/end window, soonest first">
          {upcoming.length ? (
            <ul className="space-y-2">
              {upcoming.map((q) => (
                <li
                  key={q.id}
                  className="flex items-start gap-3 rounded-2xl border border-border p-3"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium line-clamp-2">“{q.text}”</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {q.start_at ? formatInTz(q.start_at, tz) : "anytime"}
                      {" → "}
                      {q.end_at ? formatInTz(q.end_at, tz) : "open-ended"}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      q.status === "active"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {q.status.toUpperCase()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No quote has a scheduled window yet. Edit any quote (Quotes tab → Edit) and set a
              start/end date &amp; time to plan exactly when it appears.
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}
