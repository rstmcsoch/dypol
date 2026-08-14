import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, Check, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchOnboardingOptions,
  getAccountState,
  invalidateAccountState,
  submitOnboarding,
  type OnboardingExam,
} from "@/lib/account";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Get started — Dypol" }] }),
  ssr: false,
  component: Onboarding,
});

/**
 * Mandatory onboarding: exam + preparation year.
 * Completion is recorded by a security-definer database function — the
 * root route guard keeps redirecting here until the DB says it is done.
 */
function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [exam, setExam] = useState<OnboardingExam | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [options, setOptions] = useState<OnboardingExam[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      const state = await getAccountState(data.user.id, true);
      if (state.blocked) {
        navigate({ to: "/blocked", replace: true });
        return;
      }
      if (state.completed) {
        navigate({ to: "/", replace: true });
        return;
      }
      const res = await fetchOnboardingOptions();
      if (!res.ok) throw new Error(res.error ?? "Could not load exam options");
      setOptions(res.exams);
      if (!res.exams.length) {
        setError("No exams are available yet. Please contact support.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load exam options");
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const years = useMemo(() => exam?.years ?? [], [exam]);

  const finish = async () => {
    if (!exam || year == null || busy) return;
    setBusy(true);
    try {
      const res = await submitOnboarding(exam.slug, year);
      if (!res.ok) {
        if (res.error === "ACCOUNT_BLOCKED") {
          toast.error("Your account is blocked.");
          navigate({ to: "/blocked", replace: true });
          return;
        }
        throw new Error("Could not save your selection");
      }
      const { data } = await supabase.auth.getUser();
      invalidateAccountState(data.user?.id);
      toast.success("You're all set — welcome to Dypol!");
      navigate({ to: "/", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[100dvh] px-4 py-8 grid place-items-center">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-3">
          <div data-slot="logo" className="h-10 w-10 rounded-xl gradient-primary grid place-items-center text-primary-foreground font-black">D</div>
          <div className="font-display font-black text-2xl">DYPOL<span className="text-primary">.</span></div>
        </div>

        <div className="mt-6 rounded-3xl border border-border glass-strong p-6 md:p-8">
          <div className="flex gap-1.5">
            {[1, 2].map((n) => (
              <div key={n} className={`h-1.5 flex-1 rounded-full transition-all ${n <= step ? "gradient-primary" : "bg-muted"}`} />
            ))}
          </div>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-primary font-semibold">
            <Sparkles className="h-3 w-3" /> STEP {step} OF 2
          </div>

          {error && options === null ? (
            <div className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-center">
              <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              <button
                onClick={() => void load()}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-semibold hover:bg-muted active:scale-95 transition"
              >
                <RefreshCw className="h-4 w-4" /> Try again
              </button>
            </div>
          ) : options === null ? (
            <div className="mt-6 flex justify-center py-10 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                  <h2 className="mt-4 font-display text-3xl font-black">Which exam are you preparing for?</h2>
                  <p className="mt-1 text-sm text-muted-foreground">This shapes your materials, filters and countdown.</p>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {options.map((e) => (
                      <button
                        key={e.slug}
                        onClick={() => {
                          setExam(e);
                          setYear(null);
                          setStep(2);
                        }}
                        className={`relative rounded-2xl border py-3 font-semibold transition active:scale-95 ${
                          exam?.slug === e.slug ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                        }`}
                      >
                        {e.name}
                        {exam?.slug === e.slug && <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Required — you can always change this later from your profile.
                  </p>
                </motion.div>
              )}
              {step === 2 && exam && (
                <motion.div key="2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                  <h2 className="mt-4 font-display text-3xl font-black">Which year are you preparing for?</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Preparing for <span className="font-semibold text-foreground">{exam.name}</span>.
                  </p>
                  <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {years.map((y) => (
                      <button
                        key={y}
                        onClick={() => setYear(y)}
                        className={`relative rounded-2xl border py-3 font-semibold transition active:scale-95 ${
                          year === y ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                        }`}
                      >
                        {y}
                        {year === y && <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setStep(1)}
                      className="rounded-2xl border border-border py-3 font-semibold hover:bg-muted flex items-center justify-center gap-2 active:scale-95 transition"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    <button
                      onClick={() => void finish()}
                      disabled={year == null || busy}
                      className="rounded-2xl gradient-primary text-primary-foreground py-3 font-semibold btn-glow flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Enter Dypol <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        <p className="mt-4 text-xs text-muted-foreground text-center">
          This step can't be skipped — it keeps your materials, filters and countdown accurate.
        </p>
      </div>
    </main>
  );
}
