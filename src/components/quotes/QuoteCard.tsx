import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote as QuoteIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePageVisible, usePrefersReducedMotion } from "@/hooks/use-page-visible";
import {
  animationDurationMs,
  useActiveQuotes,
  type ActiveQuote,
  type QuoteAppearance,
} from "@/lib/daily-quotes";

export const DEFAULT_APPEARANCE: QuoteAppearance = {
  show_author: true,
  show_category: true,
  show_icon: true,
  animation_enabled: true,
  animation_type: "fade",
  animation_speed: "normal",
  animation_duration_ms: 500,
  card_style: "glass",
  text_align: "left",
};

/* ------------------------------------------------------------------ */
/* Pure view — shared by the home screen and the admin live preview    */
/* ------------------------------------------------------------------ */

export function QuoteCardView({
  quotes,
  appearance,
  multiLayout = "stack",
  multiIntervalSeconds = 8,
  heading = "DAILY QUOTE",
  className = "",
}: {
  quotes: ActiveQuote[];
  appearance?: Partial<QuoteAppearance>;
  multiLayout?: string;
  multiIntervalSeconds?: number;
  heading?: string;
  className?: string;
}) {
  const a: QuoteAppearance = { ...DEFAULT_APPEARANCE, ...(appearance ?? {}) };
  const list = useMemo(() => quotes.filter((q) => q?.text), [quotes]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState(1);
  const duration = animationDurationMs(a);
  const count = list.length;
  const pageVisible = usePageVisible();
  const reducedMotion = usePrefersReducedMotion();

  const single = count <= 1 || multiLayout === "stack";
  const active = list[Math.min(index, Math.max(count - 1, 0))];

  const step = useCallback(
    (dir: 1 | -1) => {
      setDirection(dir);
      setIndex((p) => (count ? (p + dir + count) % count : 0));
    },
    [count],
  );

  // Automatic layouts: carousel + rotate advance on a timer.
  const auto = !single && (multiLayout === "carousel" || multiLayout === "rotate");
  useEffect(() => {
    if (!auto || paused || !pageVisible || reducedMotion || count < 2) return;
    const ms = Math.max(3, multiIntervalSeconds || 8) * 1000;
    const t = setInterval(() => step(1), ms);
    return () => clearInterval(t);
  }, [auto, paused, pageVisible, reducedMotion, count, multiIntervalSeconds, step]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  if (!count) return null;

  const onGradient = a.card_style === "gradient";
  const wrapClass =
    a.card_style === "solid"
      ? "rounded-3xl border border-border bg-card"
      : a.card_style === "outline"
        ? "rounded-3xl border-2 border-primary/35 bg-primary/[0.04]"
        : a.card_style === "gradient"
          ? "rounded-3xl border border-transparent gradient-primary text-primary-foreground shadow-lg"
          : "rounded-3xl border border-border glass";

  const anim = variantsFor(a.animation_type, direction);

  const renderQuote = (q: ActiveQuote, k: string) => (
    <motion.blockquote
      key={k}
      initial={a.animation_enabled ? anim.initial : false}
      animate={anim.animate}
      exit={a.animation_enabled ? anim.exit : undefined}
      transition={{ duration: duration / 1000, ease: "easeOut" }}
      className={a.text_align === "center" ? "text-center" : "text-left"}
    >
      <p
        className={`text-base md:text-lg font-medium leading-relaxed font-display tracking-tight break-words ${
          onGradient ? "text-primary-foreground" : ""
        }`}
      >
        “{q.text}”
      </p>
      {(a.show_author && q.author) || (a.show_category && q.category) ? (
        <footer className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {a.show_author && q.author && (
            <span
              className={`text-sm font-semibold ${
                onGradient ? "text-primary-foreground/85" : "text-muted-foreground"
              }`}
            >
              — {q.author}
            </span>
          )}
          {a.show_category && q.category && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${
                onGradient
                  ? "bg-white/20 text-primary-foreground"
                  : "bg-primary/10 text-primary border border-primary/20"
              } ${a.text_align === "center" ? "" : ""}`}
            >
              {q.category}
            </span>
          )}
        </footer>
      ) : null}
    </motion.blockquote>
  );

  return (
    <div
      className={`relative overflow-hidden p-5 md:p-6 ${wrapClass} ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {a.show_icon && (
            <div
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                onGradient
                  ? "bg-white/20 text-primary-foreground"
                  : "gradient-primary text-primary-foreground btn-glow"
              }`}
            >
              <QuoteIcon className="h-4 w-4" />
            </div>
          )}
          <span
            className={`text-xs font-semibold tracking-widest ${
              onGradient ? "text-primary-foreground/85" : "text-primary"
            }`}
          >
            {heading}
          </span>
        </div>
        {!single && multiLayout === "steps" && (
          <span
            className={`text-xs font-semibold tabular-nums ${
              onGradient ? "text-primary-foreground/70" : "text-muted-foreground"
            }`}
          >
            {index + 1} / {count}
          </span>
        )}
      </div>

      {/* quote body */}
      <div className={a.show_icon ? "mt-4" : "mt-3"}>
        {single ? (
          <div className={count > 1 ? "space-y-4 divide-y divide-border/60" : ""}>
            {list.map((q, i) => (
              <div key={q.id} className={i > 0 ? "pt-4" : ""}>
                <AnimatePresence mode="wait" initial={true}>
                  {renderQuote(q, q.id)}
                </AnimatePresence>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative">
            <AnimatePresence mode="wait" initial={true} custom={direction}>
              {active ? renderQuote(active, active.id) : null}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* controls for multi layouts */}
      {!single && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {list.map((q, i) => (
              <button
                key={q.id}
                aria-label={`Show quote ${i + 1}`}
                onClick={() => {
                  setDirection(i > index ? 1 : -1);
                  setIndex(i);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? `w-6 ${onGradient ? "bg-primary-foreground" : "gradient-primary"}`
                    : `w-1.5 ${
                        onGradient
                          ? "bg-primary-foreground/40 hover:bg-primary-foreground/70"
                          : "bg-muted-foreground/40 hover:bg-muted-foreground"
                      }`
                }`}
              />
            ))}
          </div>
          {multiLayout === "carousel" && count > 1 && (
            <div className="flex items-center gap-1">
              <ControlBtn onGradient={onGradient} onClick={() => step(-1)} label="Previous quote">
                <ChevronLeft className="h-4 w-4" />
              </ControlBtn>
              <ControlBtn onGradient={onGradient} onClick={() => step(1)} label="Next quote">
                <ChevronRight className="h-4 w-4" />
              </ControlBtn>
            </div>
          )}
          {multiLayout === "steps" && count > 1 && (
            <button
              onClick={() => step(1)}
              className={`text-xs font-semibold transition ${
                onGradient
                  ? "text-primary-foreground/85 hover:text-primary-foreground"
                  : "text-primary hover:gap-2"
              } inline-flex items-center gap-1`}
            >
              Next quote <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ControlBtn({
  children,
  onClick,
  label,
  onGradient,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  onGradient: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`grid h-8 w-8 place-items-center rounded-full transition active:scale-95 ${
        onGradient
          ? "bg-white/15 hover:bg-white/25 text-primary-foreground"
          : "glass-strong hover:scale-105"
      }`}
    >
      {children}
    </button>
  );
}

function variantsFor(type: string | undefined, direction: number) {
  switch (type) {
    case "slide":
      return {
        initial: { opacity: 0, x: 28 * direction },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 * direction },
      };
    case "scale":
      return {
        initial: { opacity: 0, scale: 0.94 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.97 },
      };
    case "blur":
      return {
        initial: { opacity: 0, filter: "blur(10px)" },
        animate: { opacity: 1, filter: "blur(0px)" },
        exit: { opacity: 0, filter: "blur(8px)" },
      };
    case "none":
      return { initial: {}, animate: {}, exit: {} };
    case "fade":
    default:
      return {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
      };
  }
}

/* ------------------------------------------------------------------ */
/* Home-screen container: server-driven content + boundary refresh     */
/* ------------------------------------------------------------------ */

export function DailyQuoteCard({ className = "" }: { className?: string }) {
  const { data, isPending, refetch } = useActiveQuotes();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refetch exactly when the current rotation period ends — only the quote
  // content updates, the page never reloads.
  const periodKey = data?.period_key;
  const refreshIn = data?.next_refresh_in_seconds;
  useEffect(() => {
    if (!data?.enabled || !refreshIn) return;
    timer.current = setTimeout(
      () => {
        refetch();
      },
      Math.min(refreshIn, 24 * 3600) * 1000 + 1500,
    );
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodKey, refreshIn, data?.enabled]);

  if (isPending) {
    return (
      <section aria-hidden className={className}>
        <div className="rounded-3xl border border-border glass p-5 md:p-6 animate-pulse">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-muted" />
            <div className="h-3 w-24 rounded-full bg-muted" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-4 w-11/12 rounded-full bg-muted" />
            <div className="h-4 w-2/3 rounded-full bg-muted" />
          </div>
        </div>
      </section>
    );
  }

  // Feature off / error / nothing to show → render nothing at all.
  if (!data?.enabled || !data.quotes?.length) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      aria-label="Daily quote"
      className={className}
    >
      <QuoteCardView
        quotes={data.quotes}
        appearance={data.appearance}
        multiLayout={data.multi_layout}
        multiIntervalSeconds={data.multi_interval_seconds}
      />
    </motion.section>
  );
}
