import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ensureFreshAccessToken } from "@/integrations/supabase/auth-token";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Hand the server a *fresh* access token. An expired access token is NOT a
    // logout — we recover it via the refresh token first, and only redirect to
    // /auth when there is truly no recoverable session.
    const token = await ensureFreshAccessToken();
    if (!token) throw redirect({ to: "/auth" });

    // getUser() validates the (now fresh) token against the live Auth API.
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
