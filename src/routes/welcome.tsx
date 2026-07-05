import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Mail, UserCircle, ArrowRight } from "lucide-react";
import { getUser } from "@/lib/user";
import { useEffect } from "react";

export const Route = createFileRoute("/welcome")({
  head: () => ({ meta: [{ title: "Welcome — Dypol" }] }),
  component: Welcome,
});

function Welcome() {
  const navigate = useNavigate();
  useEffect(() => {
    if (getUser()) navigate({ to: "/" });
  }, [navigate]);

  const continueAsGuest = () => navigate({ to: "/onboarding" });

  return (
    <main className="min-h-[calc(100vh-6rem)] px-4 grid place-items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-center gap-3">
          <div
            data-slot="logo"
            className="h-12 w-12 rounded-2xl gradient-primary grid place-items-center text-primary-foreground font-black"
          >
            D
          </div>
          <div className="font-display font-black text-3xl tracking-tight">
            DYPOL<span className="text-primary">.</span>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-border glass-strong p-6 md:p-8">
          <div className="text-xs tracking-widest text-primary text-center">✦ WELCOME</div>
          <h1 className="mt-3 font-display text-4xl font-black text-center">Step into Dypol</h1>
          <p className="mt-1 text-sm text-muted-foreground text-center">
            Pick how you'd like to continue.
          </p>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => alert("Google sign-in coming soon — connect Lovable Cloud to enable.")}
              className="w-full flex items-center justify-center gap-3 rounded-2xl border border-border py-3 font-semibold hover:bg-muted hover:-translate-y-0.5 active:scale-95 transition"
            >
              <span className="text-red-500 font-bold">G</span> Continue with Google
            </button>
            <button
              onClick={() => alert("Email sign-in coming soon — connect Lovable Cloud to enable.")}
              className="w-full flex items-center justify-center gap-3 rounded-2xl border border-border py-3 font-semibold hover:bg-muted hover:-translate-y-0.5 active:scale-95 transition"
            >
              <Mail className="h-4 w-4" /> Continue with Email
            </button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
            </div>
            <button
              onClick={continueAsGuest}
              className="w-full flex items-center justify-center gap-3 rounded-2xl gradient-primary text-primary-foreground py-3 font-semibold btn-glow hover:-translate-y-0.5 active:scale-95 transition"
            >
              <UserCircle className="h-4 w-4" /> Continue as Guest{" "}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground text-center">
            By continuing you agree to Dypol's <span className="underline">Privacy</span> &{" "}
            <span className="underline">Terms</span>.
          </p>
        </div>
      </motion.div>
    </main>
  );
}
