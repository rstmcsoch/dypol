import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight, Gift, Loader2, Package, Settings, Tag } from "lucide-react";
import { useEssentials } from "@/lib/essentials";
import { useAuth } from "@/hooks/use-auth";
import { BookmarkButton } from "@/components/BookmarkButton";
import { ShareButtons } from "@/components/ShareButtons";

export const Route = createFileRoute("/essentials")({
  head: () => ({
    meta: [
      { title: "Essentials — Dypol" },
      { name: "description", content: "Handpicked products and gear every serious aspirant should have." },
    ],
  }),
  ssr: false,
  component: Essentials,
});

function Essentials() {
  const { isAdmin } = useAuth();
  const { data: items = [], isLoading } = useEssentials();

  return (
    <main className="px-4 md:px-8 pt-6 pb-8">
      <div className="mx-auto max-w-7xl min-w-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-primary"
          >
            ✦ ESSENTIALS
          </motion.div>
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-full gradient-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 btn-glow active:scale-95 transition"
            >
              <Settings className="h-3.5 w-3.5" /> Edit essentials
            </Link>
          )}
        </div>

        <h1 className="page-title mt-4">
          Gear up. <span className="text-muted-foreground">Study smart.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          A curated shelf of books, stationery, gadgets & tools that make the grind easier. Tap any card to shop.
        </p>

        {isLoading ? (
          <div className="mt-12 flex justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-dashed border-border/60 glass p-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Gift className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-display text-2xl font-bold">Nothing here yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Check back soon — the shelf is being stocked.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="group relative w-full max-w-full min-w-0 rounded-3xl border border-border glass overflow-hidden hover:border-primary/50 hover:-translate-y-1 transition-all flex flex-col"
              >
                <div className="relative aspect-[4/3] w-full bg-muted/30 overflow-hidden">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.title}
                      loading="lazy"
                      className="h-full w-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-muted-foreground">
                      <Package className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <BookmarkButton
                      kind="essential"
                      refId={p.id}
                      title={p.title}
                      subtitle={p.description}
                      url={p.url}
                      imageUrl={p.image_url}
                    />
                  </div>
                  {p.source && (
                    <div className="absolute top-2 left-2 rounded-full bg-background/80 backdrop-blur px-2 py-1 text-[10px] font-semibold uppercase tracking-widest">
                      {p.source}
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1 min-w-0">
                  <h3 className="font-bold text-base leading-tight line-clamp-2 break-words">{p.title}</h3>
                  {p.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                  )}
                  {p.price && (
                    <div className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary">
                      <Tag className="h-3.5 w-3.5" /> {p.price}
                    </div>
                  )}
                  <div className="mt-4 flex items-center gap-2">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-full gradient-primary text-primary-foreground py-2.5 text-sm font-semibold btn-glow hover:opacity-95 active:scale-95 transition"
                    >
                      Shop Now <ArrowUpRight className="h-4 w-4" />
                    </a>
                    <ShareButtons />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
