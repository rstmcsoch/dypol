import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Info, Lock, ArrowUpRight, Settings, Loader2 } from "lucide-react";
import { usePortals } from "@/lib/site-api";
import { useAuth } from "@/hooks/use-auth";
import { BookmarkButton } from "@/components/BookmarkButton";
import { ShareButtons } from "@/components/ShareButtons";

export const Route = createFileRoute("/portals")({
  head: () => ({
    meta: [
      { title: "Portals — Dypol" },
      {
        name: "description",
        content:
          "All your study apps. One launcher. Curated mirrors and access points for popular coachings.",
      },
    ],
  }),
  ssr: false,
  component: Portals,
});

function Portals() {
  const { isAdmin } = useAuth();
  const { data: portals = [], isLoading } = usePortals();

  return (
    <main className="px-4 md:px-8 pt-6 pb-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-primary"
          >
            ✦ STUDY PORTALS
          </motion.div>
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-full gradient-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 btn-glow active:scale-95 transition"
            >
              <Settings className="h-3.5 w-3.5" /> Edit portals
            </Link>
          )}
        </div>
        <h1 className="mt-4 font-display text-5xl md:text-7xl font-black tracking-tighter">
          All your study apps. <span className="text-muted-foreground">One launcher.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Curated mirrors and access points for popular coachings. Tap any portal to open its links.
        </p>

        <div className="mt-6 rounded-2xl border border-border glass p-4 flex items-start gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <Info className="h-4 w-4" />
          </div>
          <div className="text-sm">
            <strong>Dypol does not own or host any content.</strong>{" "}
            <span className="text-muted-foreground">
              All resources belong to their respective owners. Dypol only aggregates publicly shared
              links.
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-12 flex justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {portals.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="group relative rounded-3xl border border-border glass p-5 hover:border-primary/50 hover:-translate-y-1 transition-all"
              >
                <div className="flex items-start gap-4">
                  {p.logo_url ? (
                    <img
                      src={p.logo_url}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-2xl object-cover border border-border"
                    />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-2xl border border-dashed border-border/60 grid place-items-center text-[9px] text-muted-foreground">
                      logo
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-lg truncate">{p.name}</h3>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                    <div className="mt-2 text-[10px] tracking-widest text-muted-foreground">
                      {p.link_count} LINK{p.link_count === 1 ? "" : "S"}
                    </div>
                  </div>
                  <BookmarkButton
                    kind="portal"
                    refId={p.id}
                    title={p.name}
                    subtitle={p.description}
                    url={p.link}
                    imageUrl={p.logo_url}
                  />
                </div>
                <div className="mt-5 flex items-center gap-2">
                  {p.link ? (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-full gradient-primary text-primary-foreground py-2.5 font-semibold btn-glow hover:opacity-95 active:scale-95 transition"
                    >
                      Open Portal <ArrowUpRight className="h-4 w-4" />
                    </a>
                  ) : (
                    <button
                      disabled
                      title="Coming soon"
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-muted py-2.5 font-semibold opacity-80 cursor-not-allowed"
                    >
                      <Lock className="h-3.5 w-3.5" /> Open Portal{" "}
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  )}
                  <ShareButtons
                    title={p.name}
                    url={p.link || (typeof window !== "undefined" ? window.location.href : "")}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
