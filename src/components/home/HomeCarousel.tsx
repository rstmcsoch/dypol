import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Image as ImageIcon, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useHomeSlides } from "@/lib/home-sections";

export function HomeCarousel() {
  const { data } = useHomeSlides();
  const slides = (data ?? []).filter((s) => s.enabled);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = slides.length;
  const next = useCallback(() => setI((p) => (count ? (p + 1) % count : 0)), [count]);
  const prev = useCallback(() => setI((p) => (count ? (p - 1 + count) % count : 0)), [count]);

  useEffect(() => {
    if (paused || count < 2) return;
    const t = setInterval(next, 4000);
    return () => clearInterval(t);
  }, [paused, count, next]);

  useEffect(() => {
    if (i >= count) setI(0);
  }, [count, i]);

  if (!count) return null;
  const active = slides[Math.min(i, count - 1)]!;

  return (
    <section aria-label="Highlights" className="mt-14">
      <SectionHeading kicker="GALLERY" title="Highlights" />
      <div
        className="relative mt-5 overflow-hidden rounded-3xl border border-border glass"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="relative aspect-[16/9] sm:aspect-[16/7] w-full">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={active.id}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute inset-0"
            >
              {active.image_url ? (
                <img src={active.image_url} alt={active.caption || "Slide"} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center border-2 border-dashed border-border/60 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" /> image slot
                  </span>
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-transparent" />
            </motion.div>
          </AnimatePresence>

          {active.caption && (
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
              <p className="max-w-2xl text-sm sm:text-lg font-semibold">{active.caption}</p>
              {active.link && (
                <a
                  href={active.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full gradient-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground btn-glow hover:-translate-y-0.5 active:scale-95 transition"
                >
                  Open
                </a>
              )}
            </div>
          )}
        </div>

        {count > 1 && (
          <>
            <CarouselBtn side="left" onClick={prev}>
              <ChevronLeft className="h-4 w-4" />
            </CarouselBtn>
            <CarouselBtn side="right" onClick={next}>
              <ChevronRight className="h-4 w-4" />
            </CarouselBtn>
            <button
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Play slideshow" : "Pause slideshow"}
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full glass-strong text-foreground hover:scale-105 active:scale-95 transition"
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
              {slides.map((s, idx) => (
                <button
                  key={s.id}
                  aria-label={`Go to slide ${idx + 1}`}
                  onClick={() => setI(idx)}
                  className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 gradient-primary" : "w-1.5 bg-muted-foreground/50 hover:bg-muted-foreground"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function CarouselBtn({
  side, onClick, children,
}: { side: "left" | "right"; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={side === "left" ? "Previous slide" : "Next slide"}
      className={`absolute top-1/2 -translate-y-1/2 ${side === "left" ? "left-3" : "right-3"} grid h-9 w-9 place-items-center rounded-full glass-strong text-foreground hover:scale-110 active:scale-95 transition`}
    >
      {children}
    </button>
  );
}

export function SectionHeading({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs tracking-widest text-primary">{kicker}</div>
      <h2 className="mt-1 font-display text-3xl md:text-4xl font-black tracking-tight">{title}</h2>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}
