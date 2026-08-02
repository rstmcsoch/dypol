import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { useHomeStats } from "@/lib/home-sections";
import { SectionHeading } from "./HomeCarousel";

function useCountUp(target: number, run: boolean, ms = 1200) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / ms, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return n;
}

export function HomeStatsGraph() {
  const { data } = useHomeStats();
  const stats = (data ?? []).filter((s) => s.enabled);
  const [inView, setInView] = useState(false);

  if (!stats.length) return null;
  console.log('DBG stats', JSON.stringify(stats));
  const max = Math.max(...stats.map((s) => s.value), 1);

  return (
    <section aria-label="Statistics" className="mt-14">
      <SectionHeading kicker="BY THE NUMBERS" title="Growing every day" sub="Animated as you scroll." />
      <motion.div
        onViewportEnter={() => { console.log('DBG viewport enter'); setInView(true); }}
        viewport={{ once: true, amount: 0.2 }}
        className="mt-5 rounded-3xl border border-border glass p-5 sm:p-8"
      >
        <div className="grid gap-6 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, idx) => (
            <StatBar key={s.id} stat={s} max={max} inView={inView} delay={idx * 0.12} />
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function StatBar({
  stat, max, inView, delay,
}: {
  stat: { label: string; value: number; unit: string; caption: string };
  max: number;
  inView: boolean;
  delay: number;
}) {
  const n = useCountUp(stat.value, inView);
  const pct = Math.max((stat.value / max) * 100, 4);
  return (
    <div className="min-w-0">
      <div className="flex items-end justify-between gap-2">
        <span className="truncate text-xs tracking-widest text-muted-foreground uppercase">{stat.label}</span>
        <span className="shrink-0 font-display text-2xl font-black text-gradient">
          {Math.round(n).toLocaleString()}
          {stat.unit}
        </span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full gradient-primary"
          initial={{ width: 0 }}
          animate={inView ? { width: `${pct}%` } : { width: 0 }}
          transition={{ duration: 1.1, delay, ease: "easeOut" }}
        />
      </div>
      {stat.caption && <p className="mt-1.5 text-xs text-muted-foreground">{stat.caption}</p>}
    </div>
  );
}
