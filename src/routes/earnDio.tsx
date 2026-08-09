import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, ExternalLink, Clock, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { DioStar, DioBalance } from "@/components/dio/DioBits";
import {
  useAdOffers,
  useMyCompletions,
  useStartAd,
  useDioBalance,
  formatDio,
  dioKeys,
  type AdOffer,
} from "@/lib/dio";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/earnDio")({
  head: () => ({
    meta: [
      { title: "Earn Dio — Dypol" },
      {
        name: "description",
        content: "Complete sponsored activities to earn Dio and unlock curated study resources on Dypol.",
      },
      { property: "og:title", content: "Earn Dio — Dypol" },
      {
        property: "og:description",
        content: "Complete sponsored activities to earn Dio and unlock curated study resources on Dypol.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: EarnDio,
});

/**
 * Future earning methods (streaks, referrals, challenges) plug in as extra
 * sections here and reuse the same Dio ledger. Only Ads are live for now.
 */
function EarnDio() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const { data: balance } = useDioBalance(user?.id);
  const { data: offers = [], isLoading } = useAdOffers();
  const { data: completions = [] } = useMyCompletions(user?.id);

  // A single refetch when the student comes back to the tab — no polling.
  useEffect(() => {
    if (!user) return;
    const onFocus = () => {
      qc.invalidateQueries({ queryKey: dioKeys.completions(user.id) });
      qc.invalidateQueries({ queryKey: dioKeys.wallet(user.id) });
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user?.id, qc]);

  const live = offers.filter((o) => {
    if (!o.active) return false;
    const now = Date.now();
    if (o.starts_at && new Date(o.starts_at).getTime() > now) return false;
    if (o.ends_at && new Date(o.ends_at).getTime() < now) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main className="px-4 pt-6 pb-24 md:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs tracking-widest text-[#e8b23a]">✦ DIO</div>
            <h1 className="mt-2 font-display text-5xl font-black tracking-tighter md:text-6xl">Earn Dio</h1>
            <p className="mt-3 max-w-md text-muted-foreground">
              Complete sponsored activities and use your Dio to unlock useful resources. Calm, optional, no pressure.
            </p>
          </div>
          <div className="rounded-3xl border border-border glass px-5 py-4 text-right">
            <div className="text-[10px] tracking-widest text-muted-foreground">YOUR BALANCE</div>
            <div className="mt-1 flex items-center justify-end gap-1.5 text-2xl font-black">
              <DioStar className="text-xl" /> {formatDio(user ? (balance ?? 0) : 0)}
            </div>
          </div>
        </div>

        {!user && (
          <div className="mt-8 rounded-3xl border border-dashed border-border p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e8b23a]/10">
              <DioStar className="text-xl" />
            </div>
            <h2 className="mt-4 text-xl font-bold">Create an account to earn Dio</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Dio rewards are tied to your account. Sign up free and start at ✦ 0.
            </p>
            <Link
              to="/auth"
              className="mt-5 inline-flex items-center gap-2 rounded-full gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground btn-glow active:scale-95 transition"
            >
              Sign up <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {user && (
          <section className="mt-8">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold tracking-widest text-muted-foreground uppercase">Sponsored activities</h2>
            </div>

            {isLoading ? (
              <div className="mt-8 flex justify-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : live.length === 0 ? (
              <div className="mt-5 rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                No activities available right now. Check back soon.
              </div>
            ) : (
              <ul className="mt-5 space-y-3">
                {live.map((offer, i) => (
                  <motion.li
                    key={offer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  >
                    <OfferRow
                      offer={offer}
                      completion={completions.find((c) => c.offer_id === offer.id) ?? null}
                      userId={user.id}
                    />
                  </motion.li>
                ))}
              </ul>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <Link to="/profile" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                View your Dio history <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <span className="hidden sm:inline">·</span>
              <Link to="/materials" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                Spend Dio on materials <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        )}

        <div className="mt-10 md:hidden">
          <DioBalance />
        </div>
      </div>
    </main>
  );
}

function OfferRow({
  offer,
  completion,
  userId,
}: {
  offer: AdOffer;
  completion: { status: string; reward_amount: number; reference: string } | null;
  userId: string;
}) {
  const start = useStartAd(userId);
  const [opening, setOpening] = useState(false);

  const claimed = completion?.status === "completed";
  const pending = completion?.status === "pending";

  const onStart = async () => {
    setOpening(true);
    try {
      const res = await start.mutateAsync(offer.id);
      if (!res.ok) {
        toast.error(
          res.error === "ALREADY_CLAIMED"
            ? "You've already earned Dio from this activity."
            : "This activity isn't available right now.",
        );
        return;
      }
      if (!res.url) {
        toast.error("This activity has no link configured yet.");
        return;
      }
      const url = new URL(res.url);
      url.searchParams.set("ref", res.reference!);
      window.open(url.toString(), "_blank", "noopener,noreferrer");
      toast.success("Activity opened — your reward is verified before it's credited.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't start this activity");
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-border glass p-5 transition hover:border-[#e8b23a]/40">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-[#e8b23a]/40 bg-[#e8b23a]/10 px-3 py-1 text-sm font-bold text-[#e8b23a]">
        <DioStar /> +{offer.reward_amount}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold">{offer.title}</div>
        {offer.description && <p className="text-sm text-muted-foreground">{offer.description}</p>}
        {pending && (
          <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Awaiting verification — Dio is credited once completion is confirmed.
          </div>
        )}
      </div>
      {claimed ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-[#e8b23a]" /> Earned
        </span>
      ) : (
        <button
          onClick={onStart}
          disabled={opening || start.isPending}
          className="inline-flex items-center gap-2 rounded-full gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground btn-glow active:scale-95 transition disabled:opacity-60"
        >
          {opening || start.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
          {pending ? "Continue" : "Start"}
        </button>
      )}
    </div>
  );
}
