import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Ban, Clock, LogOut, LifeBuoy } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getAccountState, type AccountState } from "@/lib/account";
import { useSiteSettings } from "@/lib/site-api";

export const Route = createFileRoute("/blocked")({
  head: () => ({ meta: [{ title: "Account blocked — Dypol" }] }),
  ssr: false,
  component: Blocked,
});

/** Clear blocked-account message shown to users with an active block. */
function Blocked() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: settings } = useSiteSettings();
  const [state, setState] = useState<AccountState | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    getAccountState(user.id, true).then((s) => {
      if (!s.blocked) {
        // Block expired or lifted — send them back into the app.
        navigate({ to: "/", replace: true });
        return;
      }
      setState(s);
    });
  }, [user, loading, navigate]);

  const signOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const until = state?.blockedUntil ? new Date(state.blockedUntil) : null;

  return (
    <main className="min-h-[100dvh] px-4 py-8 grid place-items-center">
      <div className="w-full max-w-md rounded-3xl border border-border glass-strong p-6 md:p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <Ban className="h-7 w-7" />
        </div>
        <h1 className="mt-4 font-display text-3xl font-black">Account blocked</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {state?.permanent
            ? "This account has been blocked by the Dypol team. Your data is safe and has not been deleted."
            : until && until.getTime() > Date.now()
              ? "This account is temporarily blocked by the Dypol team. Your data is safe and has not been deleted."
              : "This account is currently blocked. Your data is safe and has not been deleted."}
        </p>

        {state?.blockReason && (
          <div className="mt-4 rounded-2xl border border-border p-4 text-left text-sm">
            <div className="text-[10px] tracking-widest text-muted-foreground">REASON</div>
            <p className="mt-1 break-words">{state.blockReason}</p>
          </div>
        )}

        {!state?.permanent && until && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-primary" />
            Access restores{" "}
            <span className="font-semibold text-foreground">
              {until.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={signOut}
            disabled={signingOut}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 font-semibold hover:bg-muted active:scale-95 transition disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
          {settings?.support_email && (
            <a
              href={`mailto:${settings.support_email}?subject=${encodeURIComponent("Account block review")}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/40 text-primary px-5 py-2.5 text-sm font-semibold hover:bg-primary/10 active:scale-95 transition"
            >
              <LifeBuoy className="h-4 w-4" /> Contact support
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
