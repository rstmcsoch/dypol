import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Heart, Info, Lock, ArrowUpRight } from "lucide-react";
import { PORTALS } from "@/lib/data";

export const Route = createFileRoute("/portals")({
  head: () => ({
    meta: [
      { title: "Portals — Dypol" },
      { name: "description", content: "All your study apps. One launcher. Curated mirrors and access points for popular coachings." },
    ],
  }),
  component: Portals,
});

function Portals() {
  return (
    <main className="px-4 md:px-8 pt-6 pb-16">
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-primary">
          ✦ STUDY PORTALS
        </motion.div>
        <h1 className="mt-4 font-display text-5xl md:text-7xl font-black tracking-tighter">
          All your study apps. <span className="text-muted-foreground">One launcher.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Curated mirrors and access points for popular coachings. Tap any portal to open its links — cards below are teasers where you can drop your own links.
        </p>

        <div className="mt-6 rounded-2xl border border-border glass p-4 flex items-start gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <Info className="h-4 w-4" />
          </div>
          <div className="text-sm">
            <strong>Dypol does not own or host any content.</strong>{" "}
            <span className="text-muted-foreground">
              All resources belong to their respective owners. Dypol only aggregates publicly shared links.
            </span>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PORTALS.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="group relative rounded-3xl border border-border glass p-5 hover:border-primary/50 hover:-translate-y-1 transition-all"
            >
              <div className="flex items-start gap-4">
                {/* empty logo slot per portal */}
                <div data-slot={`portal-${p.id}-logo`} className="h-14 w-14 shrink-0 rounded-2xl border border-dashed border-border/60 grid place-items-center text-[9px] text-muted-foreground">
                  logo
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-lg truncate">{p.name}</h3>
                  <p className="text-sm text-muted-foreground">{p.desc}</p>
                  <div className="mt-2 text-[10px] tracking-widest text-muted-foreground">
                    {p.count} LINK{p.count === 1 ? "" : "S"}
                  </div>
                </div>
                <button className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-muted transition active:scale-90" aria-label="favorite">
                  <Heart className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
                </button>
              </div>
              <button
                disabled
                title="Add your link in src/lib/data.ts"
                className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full bg-muted py-2.5 font-semibold opacity-80 cursor-not-allowed"
              >
                <Lock className="h-3.5 w-3.5" /> Open Portal <ArrowUpRight className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
