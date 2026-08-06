import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSitePage } from "@/lib/site-pages";

/** Very small markdown-ish renderer: ## heading, - list, ![alt](url) image, paragraphs. */
function RichBody({ body }: { body: string }) {
  const blocks = body.replace(/\r\n/g, "\n").split(/\n{2,}/).filter((b) => b.trim());
  return (
    <div className="space-y-5">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());

        const img = block.trim().match(/^!\[(.*?)\]\((.*?)\)$/);
        if (img) {
          return (
            <img
              key={i}
              src={img[2]}
              alt={img[1]}
              loading="lazy"
              className="w-full rounded-3xl border border-border object-cover"
            />
          );
        }

        if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
          return (
            <ul key={i} className="space-y-2">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-3 text-sm md:text-base text-muted-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full gradient-primary" />
                  <span>{l.replace(/^\s*[-*]\s+/, "")}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (/^###\s+/.test(lines[0])) {
          return (
            <h3 key={i} className="pt-2 font-display text-lg font-bold">
              {lines[0].replace(/^###\s+/, "")}
            </h3>
          );
        }

        if (/^##\s+/.test(lines[0])) {
          const rest = lines.slice(1).join(" ");
          return (
            <div key={i} className="pt-2">
              <h2 className="font-display text-2xl md:text-3xl font-black tracking-tight">
                {lines[0].replace(/^##\s+/, "")}
              </h2>
              {rest && <p className="mt-2 text-sm md:text-base text-muted-foreground">{rest}</p>}
            </div>
          );
        }

        return (
          <p key={i} className="text-sm md:text-base leading-relaxed text-muted-foreground">
            {block}
          </p>
        );
      })}
    </div>
  );
}

export function SitePageView({ slug, fallbackTitle }: { slug: string; fallbackTitle: string }) {
  const { isAdmin } = useAuth();
  const { data: page, isLoading } = useSitePage(slug);

  return (
    <main className="px-4 md:px-8 pt-6 pb-20">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs tracking-widest text-muted-foreground hover:text-primary transition"
          >
            <ArrowLeft className="h-3 w-3" /> BACK TO SITE
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-full gradient-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 btn-glow active:scale-95 transition"
            >
              <Settings className="h-3.5 w-3.5" /> Edit page
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="mt-16 grid place-items-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-5"
          >
            <h1 className="font-display text-4xl md:text-6xl font-black tracking-tighter leading-[0.9]">
              {page?.title ?? fallbackTitle}
              <span className="text-gradient">.</span>
            </h1>
            {page?.subtitle && (
              <p className="mt-3 text-base md:text-lg text-muted-foreground">{page.subtitle}</p>
            )}

            {page?.hero_image_url ? (
              <img
                src={page.hero_image_url}
                alt=""
                className="mt-6 aspect-[16/7] w-full rounded-3xl object-cover border border-border"
              />
            ) : (
              isAdmin && (
                <div className="mt-6 aspect-[16/7] w-full rounded-3xl border-2 border-dashed border-border/60 grid place-items-center text-xs text-muted-foreground">
                  cover image slot — add one in Admin → Pages
                </div>
              )
            )}

            <div className="mt-8 rounded-3xl border border-border glass p-6 md:p-8">
              {page?.body?.trim() ? (
                <RichBody body={page.body} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  This page hasn't been written yet.
                  {isAdmin && " Add the content in Admin → Pages."}
                </p>
              )}
            </div>
          </motion.article>
        )}
      </div>
    </main>
  );
}
