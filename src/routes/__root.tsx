import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
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

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-black text-gradient">404</h1>
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
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
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

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
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
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <div className="min-h-screen bg-background text-foreground relative">
          <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-40">
            <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full gradient-primary blur-[120px]" />
            <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full gradient-primary blur-[140px] opacity-60" />
          </div>
          <AppNav />
          <div className="pb-28 lg:pb-0"><Outlet /></div>
          <Toaster position="top-right" richColors />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
