import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

interface Props {
  target: string; // e.g. "JEE 2027" or "NEET 2028"
}

function parseExamDate(target: string): { date: Date; label: string } | null {
  const m = /^(JEE|NEET)\s+(\d{4})$/i.exec(target.trim());
  if (!m) return null;
  const exam = m[1].toUpperCase();
  const year = parseInt(m[2], 10);
  // JEE (Main Session 1) tentative Jan 21; NEET tentative May 2.
  const date =
    exam === "JEE" ? new Date(Date.UTC(year, 0, 21, 3, 30)) : new Date(Date.UTC(year, 4, 2, 3, 30));
  return { date, label: exam };
}

function diff(d: Date) {
  const now = Date.now();
  let ms = d.getTime() - now;
  const past = ms < 0;
  ms = Math.abs(ms);
  const s = Math.floor(ms / 1000);
  return {
    past,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    mins: Math.floor((s % 3600) / 60),
    secs: s % 60,
  };
}

export function ExamCountdown({ target }: Props) {
  const parsed = parseExamDate(target);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  void tick;

  if (!parsed) return null;

  const t = diff(parsed.date);
  const prettyDate = parsed.date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const cells: [string, number][] = [
    ["Days", t.days],
    ["Hours", t.hours],
    ["Minutes", t.mins],
    ["Seconds", t.secs],
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border glass-strong p-6 md:p-7">
      <div aria-hidden className="absolute inset-0 -z-10 opacity-30 gradient-primary" />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border glass px-3 py-1 text-xs font-semibold text-primary">
          <Timer className="h-3.5 w-3.5" /> {t.past ? "TIME SINCE" : "COUNTDOWN"} · {target}
        </div>
        <div className="text-xs text-muted-foreground">Target: {prettyDate}</div>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
        {cells.map(([label, val]) => (
          <div
            key={label}
            className="rounded-2xl border border-border bg-background/40 backdrop-blur px-2 py-4 text-center"
          >
            <div className="font-display text-[clamp(1.15rem,6vw,3rem)] font-black tabular-nums leading-none">
              {val.toString().padStart(2, "0")}
            </div>
            <div className="mt-1.5 text-[10px] sm:text-xs tracking-widest text-muted-foreground">
              {label.toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-center text-[10px] tracking-wide text-muted-foreground italic">
        * Tentative Date
      </div>
    </section>
  );
}
