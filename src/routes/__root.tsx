import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  redirect,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AppNav } from "@/components/nav/AppNav";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { ActivityTracker } from "@/components/ActivityTracker";
import { getAccountState, invalidateAccountState } from "@/lib/account";

/** Routes that are reachable without completed onboarding / while blocked. */
const GUARD_EXEMPT = new Set(["/onboarding", "/auth", "/blocked", "/welcome"]);

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-[clamp(3rem,18vw,4.5rem)] font-black text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page doesn't exist yet. Head back home and keep it unscripted.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-full gradient-primary px-6 py-2.5 text-sm font-medium text-primary-foreground btn-glow hover:opacity-95 active:scale-95 transition"
        >
          Go home
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">Something broke</h1>
        <p className="mt-2 text-sm text-muted-foreground">Try again or head home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full gradient-primary px-5 py-2 text-sm font-medium text-primary-foreground btn-glow"
          >
            Try again
          </button>
          <a href="/" className="rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-muted">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Global account guard: mandatory onboarding and block enforcement in the
  // navigation layer. Runs client-side (most routes are ssr:false); the
  // authoritative enforcement lives in the database (RLS + RPC checks).
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return; // server render: skip
    const path = location.pathname;
    if (GUARD_EXEMPT.has(path)) return;

    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return;

    try {
      const state = await getAccountState(uid);
      // Blocked takes priority over onboarding so blocked users always see
      // the block screen instead of an onboarding form they cannot complete.
      if (state.blocked) {
        throw redirect({ to: "/blocked", replace: true });
      }
      if (!state.completed) {
        throw redirect({ to: "/onboarding", replace: true });
      }
    } catch (err) {
      if (err && typeof err === "object" && "isRedirect" in err) throw err;
      // Verification failed (network/DB hiccup) — never brick navigation.
      // Enforcement still applies at the data layer.
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { title: "Dypol — FROM POTENTIAL TO PERFORMANCE" },
      { name: "description", content: "Dypol is your study companion — curated materials, portals, and support, all in one calm launcher." },
      { name: "author", content: "Dypol" },
      { property: "og:title", content: "Dypol — FROM POTENTIAL TO PERFORMANCE!" },
      { property: "og:description", content: "Dypol is your study companion — curated materials, portals, and support, all in one calm launcher." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Dypol — FROM POTENTIAL TO PERFORMANCE!" },
      { name: "twitter:description", content: "Dypol is your study companion — curated materials, portals, and support, all in one calm launcher." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const THEME_BOOT = `(function(){try{var t=localStorage.getItem("dypol-theme")||"sunset";var a=localStorage.getItem("dypol-appearance")||localStorage.getItem("dypol-mode")||"system";if(a!=="light"&&a!=="dark"&&a!=="system")a="system";var dark=a==="dark"||(a==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.setAttribute("data-theme",t);r.classList.toggle("dark",dark);r.style.colorScheme=dark?"dark":"light";}catch(e){}})();`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      invalidateAccountState();
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <div className="app-shell bg-background text-foreground relative">
          {/* Soft ambient glow. Radial gradients are far cheaper than the two
               giant `filter: blur(120/140px)` surfaces they replace — those
               sat behind every backdrop-filter layer and kept the GPU busy. */}
          <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <div
              className="absolute -top-32 left-1/4 h-[40rem] w-[40rem] max-w-[90vw] rounded-full"
              style={{
                background: "radial-gradient(circle, var(--grad-a) 0%, transparent 70%)",
                opacity: 0.4,
              }}
            />
            <div
              className="absolute -bottom-40 right-1/4 h-[40rem] w-[40rem] max-w-[90vw] rounded-full"
              style={{
                background: "radial-gradient(circle, var(--grad-b) 0%, transparent 70%)",
                opacity: 0.32,
              }}
            />
          </div>
          <AppNav />
          <div className="app-content"><Outlet /></div>
          <ActivityTracker />
          <Toaster position="top-right" richColors />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
