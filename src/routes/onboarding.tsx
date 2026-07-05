import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, Check } from "lucide-react";
import { useState } from "react";
import { saveUser } from "@/lib/user";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Get started — Dypol" }] }),
  component: Onboarding,
});

const TARGETS = ["Creator", "Student", "Founder", "Athlete", "Artist", "Other"] as const;

function Onboarding() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [target, setTarget] = useState<string>("Creator");
  const navigate = useNavigate();

  const finish = () => {
    saveUser({
      displayName: name || "Guest",
      target,
      isGuest: true,
      createdAt: new Date().toISOString(),
    });
    navigate({ to: "/" });
  };

  return (
    <main className="min-h-[calc(100vh-6rem)] px-4 grid place-items-center">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-3">
          <div
            data-slot="logo"
            className="h-10 w-10 rounded-xl gradient-primary grid place-items-center text-primary-foreground font-black"
          >
            D
          </div>
          <div className="font-display font-black text-2xl">
            DYPOL<span className="text-primary">.</span>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-border glass-strong p-6 md:p-8">
          <div className="flex gap-1.5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1.5 flex-1 rounded-full transition-all ${n <= step ? "gradient-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-primary font-semibold">
            <Sparkles className="h-3 w-3" /> STEP {step} OF 3
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="1"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
              >
                <h2 className="mt-4 font-display text-3xl font-black">What should we call you?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  This name shows up across Dypol.
                </p>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Arjun Sharma"
                  className="mt-5 w-full rounded-2xl border border-border bg-transparent px-4 py-3 outline-none focus:border-primary transition"
                />
                <button
                  disabled={!name.trim()}
                  onClick={() => setStep(2)}
                  className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl gradient-primary text-primary-foreground py-3 font-semibold btn-glow disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            )}
            {step === 2 && (
              <motion.div
                key="2"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
              >
                <h2 className="mt-4 font-display text-3xl font-black">Pick your path</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Helps us tailor your experience.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {TARGETS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTarget(t)}
                      className={`relative rounded-2xl border py-3 font-semibold transition active:scale-95 ${
                        target === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {t}
                      {target === t && (
                        <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
                      )}
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
                    onClick={() => setStep(3)}
                    className="rounded-2xl gradient-primary text-primary-foreground py-3 font-semibold btn-glow flex items-center justify-center gap-2 active:scale-95 transition"
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}
            {step === 3 && (
              <motion.div
                key="3"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
              >
                <h2 className="mt-4 font-display text-3xl font-black">You're set, {name}.</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Living <span className="text-primary font-semibold">unscripted</span> as a{" "}
                  <span className="font-semibold">{target}</span>.
                </p>
                <div className="mt-5 rounded-2xl border border-border p-4 text-sm text-muted-foreground">
                  Everything you customize stays on this device unless you sign in later.
                </div>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setStep(2)}
                    className="rounded-2xl border border-border py-3 font-semibold hover:bg-muted flex items-center justify-center gap-2 active:scale-95 transition"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    onClick={finish}
                    className="rounded-2xl gradient-primary text-primary-foreground py-3 font-semibold btn-glow flex items-center justify-center gap-2 active:scale-95 transition"
                  >
                    Enter Dypol <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
