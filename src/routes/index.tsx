import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Headphones, Sparkles, Copy, Check, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useSiteSettings } from "@/lib/site-api";
import { useAuth } from "@/hooks/use-auth";
import { ExamCountdown } from "@/components/ExamCountdown";
import { supabase } from "@/integrations/supabase/client";
import { HomeCarousel } from "@/components/home/HomeCarousel";
import { HomeStatsGraph } from "@/components/home/HomeStatsGraph";
import { HomePostsMarquee } from "@/components/home/HomePostsMarquee";
import { DailyQuoteCard } from "@/components/quotes/QuoteCard";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Home,
});

function Home() {
  const { isAdmin, user } = useAuth();
  const { data: s } = useSiteSettings();
  const [copied, setCopied] = useState(false);
  const [examTarget, setExamTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setExamTarget(null); return; }
    supabase.from("profiles").select("target,selected_exam,preparation_year").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        setExamTarget(
          data?.target ??
            (data?.selected_exam && data.preparation_year != null
              ? `${data.selected_exam} ${data.preparation_year}`
              : null),
        );
      });
  }, [user?.id]);

  const promoCode = s?.promo_code ?? "UNSCRIPTED10";
  const copy = async () => {
    await navigator.clipboard.writeText(promoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main className="px-4 md:px-8 pt-6 pb-8">
      <div className="mx-auto max-w-6xl min-w-0">
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-primary"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            WELCOME BACK
          </motion.div>
          {isAdmin && (
            <Link to="/admin" className="inline-flex items-center gap-1.5 rounded-full gradient-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 btn-glow active:scale-95 transition">
              <Settings className="h-3.5 w-3.5" /> Edit site
            </Link>
          )}
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
              className="hero-title"
            >
              {s?.hero_headline ?? "DYPOL"}<span className="text-gradient align-top text-[0.4em]">®</span>
            </motion.h1>
            <motion.div
  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25 }}
  className="mt-4 max-w-2xl"
>
  <p className="text-lg md:text-2xl font-medium">
    <span className="text-gradient font-bold">{s?.tagline ?? "Unscripted Life"}</span>
  </p>
  <p className="mt-2 text-lg md:text-2xl font-medium text-muted-foreground">
    {s?.hero_subheadline ?? ""}
  </p>
</motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}
              className="mt-8 flex flex-wrap gap-2 sm:gap-3"
            >
              <Link to="/materials" className="group inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-6 py-3 font-semibold btn-glow hover:[&]:opacity-95 hover:-translate-y-0.5 active:scale-95 transition">
                <BookOpen className="h-4 w-4" /> BROWSE MATERIALS
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
              </Link>
              <Link to="/portals" className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 font-semibold hover:bg-muted hover:-translate-y-0.5 active:scale-95 transition">
                <Sparkles className="h-4 w-4" /> OPEN PORTALS
              </Link>
              <Link to="/support" className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 font-semibold hover:bg-muted hover:-translate-y-0.5 active:scale-95 transition">
                <Headphones className="h-4 w-4" /> CHAT SUPPORT
              </Link>
            </motion.div>

          </div>

          <motion.aside
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-4"
          >
            <div className="relative rounded-3xl border border-border glass p-6">
              <span className="absolute -top-2 right-4 rounded-full gradient-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">LIMITED</span>
              <div className="text-xs text-muted-foreground tracking-widest">PROMO ACTIVE</div>
              <div className="mt-2 text-4xl font-black text-gradient">{s?.promo_headline ?? "10% OFF"}</div>
              <p className="text-sm text-muted-foreground mt-1">{s?.promo_body ?? ""}</p>
              <button
                onClick={copy}
                className="mt-4 w-full flex items-center justify-between rounded-2xl border border-border px-4 py-3 font-mono text-primary hover:bg-muted active:scale-[0.99] transition"
              >
                <span>{promoCode}</span>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </motion.aside>
        </div>

        {/* Daily quote — configured from Admin → Daily Quotes */}
        <DailyQuoteCard className="mt-8" />

        {/* Exam countdown — signed-in users with an exam target */}
        {user && examTarget && (
          <div className="mt-8">
            <ExamCountdown target={examTarget} />
          </div>
        )}

        {/* Below-the-line: hero image + secondary cards */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {s?.hero_image_url ? (
            <img src={s.hero_image_url} alt="" className="aspect-[16/8] w-full rounded-3xl object-cover border border-border" />
          ) : (
            <div className="aspect-[16/8] w-full rounded-3xl border-2 border-dashed border-border/60 grid place-items-center text-xs text-muted-foreground">
              hero image slot {isAdmin && <span className="ml-2">— add one in <Link to="/admin" className="text-primary underline">Admin</Link></span>}
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { top: "FREE", bot: "Access" },
                { top: "NO", bot: "Signup*" },
                { top: "DAILY", bot: "Updates" },
              ].map((x) => (
                <div key={x.top} className="rounded-2xl border border-border p-4 hover:border-primary/50 transition">
                  <div className="text-xs text-muted-foreground">{x.top}</div>
                  <div className="mt-1 font-semibold">{x.bot}</div>
                </div>
              ))}
            </div>
            <div className="rounded-3xl border border-border glass p-5">
              <div className="text-sm font-semibold">Welcome to {s?.site_title ?? "Dypol"}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                A calm space to gather your resources and just do the work.
              </p>
              {!user && (
                <Link to="/auth" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:gap-2 transition-all">
                  Sign in <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>

        <HomeCarousel />
        <HomeStatsGraph />
        <HomePostsMarquee />





        <footer className="mt-24 border-t border-border pt-8 grid gap-6 md:grid-cols-4 text-sm">
          <div>
            <div className="flex items-center gap-2">
              {s?.logo_url ? (
                <img src={s.logo_url} alt="" className="h-8 w-8 rounded-full object-cover border border-border" />
              ) : (
                <div className="h-8 w-8 rounded-full gradient-primary" />
              )}
              <span className="font-display font-bold text-lg">{s?.site_title ?? "DYPOL"}<span className="text-primary">.</span></span>
            </div>
            <div className="text-xs text-muted-foreground tracking-widest mt-2">{s?.footer_tagline ?? "LIVE UNSCRIPTED LIFE"}</div>
            <p className="text-muted-foreground mt-3 text-sm">{s?.footer_about ?? ""}</p>
          </div>
          <div>
            <div className="text-xs tracking-widest text-muted-foreground">EXPLORE</div>
            <ul className="mt-3 space-y-2">
              <li><Link to="/materials" className="hover:text-primary transition">Materials</Link></li>
              <li><Link to="/portals" className="hover:text-primary transition">Portals</Link></li>
              <li><Link to="/support" className="hover:text-primary transition">Support</Link></li>
              <li><Link to="/about" className="hover:text-primary transition">About</Link></li>
              <li><Link to="/profile" className="hover:text-primary transition">Profile</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs tracking-widest text-muted-foreground">LEGAL</div>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li>
                {s?.legal_terms_url
                  ? <a href={s.legal_terms_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition">Copyright & Terms</a>
                  : <Link to="/terms" className="hover:text-primary transition">Copyright & Terms</Link>}
              </li>
              <li>
                {s?.legal_dmca_url
                  ? <a href={s.legal_dmca_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition">DMCA Policy</a>
                  : <Link to="/dmca" className="hover:text-primary transition">DMCA Policy</Link>}
              </li>
              <li>
                {s?.legal_privacy_url
                  ? <a href={s.legal_privacy_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition">Privacy Policy</a>
                  : <Link to="/privacy" className="hover:text-primary transition">Privacy Policy</Link>}
              </li>
            </ul>
          </div>

          <div>
            <div className="text-xs tracking-widest text-muted-foreground">CONTACT</div>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              {s?.support_email && (
                <li><a href={`mailto:${s.support_email}`} className="hover:text-primary transition break-all">{s.support_email}</a></li>
              )}
              {s?.support_whatsapp && (
                <li><a href={`https://wa.me/${s.support_whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition">{s.support_whatsapp}</a></li>
              )}
              <li><Link to="/support" className="hover:text-primary transition">Support / Donate</Link></li>
            </ul>
          </div>

        </footer>
        <div className="mt-6 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
          <div>{s?.footer_copyright ?? "© 2026 DYPOL. All rights reserved."}</div>
          <div className="tracking-widest">CRAFTED UNSCRIPTED · MADE WITH INTENT</div>
        </div>
      </div>
    </main>
  );
}
