import { createClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";

function newKey(value: string) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

/**
 * Verifies the caller is a signed-in admin using the request's bearer token.
 * Uses auth.getUser(token) (a live Auth API check) instead of local JWT claim
 * verification, which fails on projects without asymmetric signing keys.
 */
export async function requireAdminFromRequest(explicitToken?: string): Promise<string> {
  const url =
    process.env["SUPABASE_URL"] ??
    import.meta.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["SUPABASE_ANON_KEY"] ??
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Auth check unavailable: backend keys missing on the server");

  let token = (explicitToken ?? "").trim();
  if (!token) {
    let authHeader = "";
    try {
      authHeader = getRequest()?.headers.get("authorization") ?? "";
    } catch {
      authHeader = "";
    }
    token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  }
  if (!token) throw new Error("Your session didn't reach the server — reload the page and try again");

  const supabase = createClient<Database>(url, key, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (newKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        if (!headers.get("Authorization")) headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    throw new Error(
      `Session rejected by auth server (${userError?.message ?? "no user"}) — sign out and sign in again`,
    );
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) throw new Error("Admin access required");

  return userData.user.id;
}
