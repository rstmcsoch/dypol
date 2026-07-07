import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Dypol" }] }),
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Welcome — you're signed in!");
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-6rem)] px-4 grid place-items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="flex items-center justify-center gap-3">
          <div
            data-slot="logo"
            className="h-12 w-12 rounded-2xl gradient-primary grid place-items-center text-primary-foreground font-black"
          >
            D
          </div>
          <div className="font-display font-black text-3xl tracking-tight">
            DYPOL<span className="text-primary">.</span>
          </div>
        </Link>

        <div className="mt-8 rounded-3xl border border-border glass-strong p-6 md:p-8">
          <div className="text-xs tracking-widest text-primary text-center">
            {mode === "signin" ? "✦ WELCOME BACK" : "✦ CREATE ACCOUNT"}
          </div>
          <h1 className="mt-3 font-display text-3xl font-black text-center">
            {mode === "signin" ? "Sign in to Dypol" : "Join Dypol"}
          </h1>

          <button
            type="button"
            onClick={async () => {
              if (busy) return;
              setBusy(true);
              try {
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (result.error)
                  throw result.error instanceof Error
                    ? result.error
                    : new Error(String(result.error));
                if (result.redirected) return;
                toast.success("Signed in with Google");
                navigate({ to: "/" });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Google sign-in failed");
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            className="mt-6 w-full flex items-center justify-center gap-2.5 rounded-2xl border border-border bg-background hover:bg-muted py-3 font-semibold transition active:scale-95 disabled:opacity-60"
          >
            <GoogleIcon className="h-4 w-4" />
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-[10px] tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> OR EMAIL{" "}
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === "signup" && (
              <label className="block">
                <span className="text-xs tracking-widest text-muted-foreground">DISPLAY NAME</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1.5 w-full rounded-2xl border border-border bg-transparent px-4 py-3 outline-none focus:border-primary transition"
                />
              </label>
            )}
            <label className="block">
              <span className="text-xs tracking-widest text-muted-foreground">EMAIL</span>
              <div className="mt-1.5 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-border bg-transparent pl-10 pr-4 py-3 outline-none focus:border-primary transition"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs tracking-widest text-muted-foreground">PASSWORD</span>
              <div className="mt-1.5 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-2xl border border-border bg-transparent pl-10 pr-4 py-3 outline-none focus:border-primary transition"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-2xl gradient-primary text-primary-foreground py-3 font-semibold btn-glow hover:-translate-y-0.5 active:scale-95 transition disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "signin" ? "Sign in" : "Create account"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                No account?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="text-primary font-semibold hover:underline"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have one?{" "}
                <button
                  onClick={() => setMode("signin")}
                  className="text-primary font-semibold hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground text-center">
          Just browsing?{" "}
          <Link to="/" className="text-primary hover:underline">
            Continue as guest
          </Link>
        </p>
      </motion.div>
    </main>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.75 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.56-2.77c-.99.66-2.26 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
