import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Save, Sparkles, Target, Calendar, Loader2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Dypol" }] }),
  ssr: false,
  component: Profile,
});

const TARGETS = [
  "JEE 2027", "JEE 2028", "JEE 2029", "JEE 2030",
  "NEET 2027", "NEET 2028", "NEET 2029", "NEET 2030",
];

interface ProfileRow {
  id: string;
  display_name: string | null;
  target: string | null;
  avatar_url: string | null;
  created_at: string;
}

function Profile() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [name, setName] = useState("");
  const [target, setTarget] = useState<string>("JEE 2027");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setProfile(data as ProfileRow);
      setName(data.display_name ?? user.email?.split("@")[0] ?? "");
      setTarget(data.target ?? "JEE 2027");
    });
  }, [user?.id, loading, navigate]);

  if (loading || !user) {
    return <div className="min-h-[60vh] grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const save = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id, display_name: name, target,
      });
      if (error) throw error;
      toast.success("Profile saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally { setBusy(false); }
  };

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); };

  const initial = (name || user.email || "?")[0]?.toUpperCase();
  const joined = profile?.created_at ?? user.created_at;

  return (
    <main className="px-4 md:px-8 pt-6 pb-16">
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl border border-border glass-strong p-6 md:p-8">
          <div aria-hidden className="absolute inset-0 -z-10 opacity-40 gradient-primary" />
          <div className="grid gap-6 md:grid-cols-[auto_1fr] items-center">
            <div className="relative">
              <div className="h-28 w-28 rounded-full gradient-primary grid place-items-center text-4xl font-black text-primary-foreground overflow-hidden">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initial}
              </div>
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-0.5 text-xs font-semibold text-primary">
                {isAdmin ? <><Shield className="h-3 w-3" /> ADMIN</> : <><Sparkles className="h-3 w-3" /> MEMBER</>}
              </div>
              <h1 className="mt-2 font-display text-5xl md:text-6xl font-black truncate">{name || user.email}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Target className="h-4 w-4" /> {target}</span>
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Joined {new Date(joined).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[1.5fr_1fr]">
          <section className="rounded-3xl border border-border glass p-6">
            <h2 className="text-2xl font-bold">Edit profile</h2>
            <div className="mt-6">
              <label className="text-xs tracking-widest text-muted-foreground">DISPLAY NAME</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-border bg-transparent px-4 py-3 outline-none focus:border-primary transition" />
            </div>
            <div className="mt-5">
              <label className="text-xs tracking-widest text-muted-foreground">TARGET EXAM</label>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TARGETS.map((t) => (
                  <button key={t} onClick={() => setTarget(t)}
                    className={`rounded-xl border py-2.5 text-sm font-semibold transition active:scale-95 ${
                      target === t ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button onClick={save} disabled={busy}
                className="inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-5 py-2.5 font-semibold btn-glow active:scale-95 transition disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
              </button>
              <button onClick={signOut}
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 font-semibold hover:bg-muted active:scale-95 transition">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
              {isAdmin && (
                <Link to="/admin" className="inline-flex items-center gap-2 rounded-full border border-primary text-primary px-5 py-2.5 font-semibold hover:bg-primary/10 active:scale-95 transition">
                  <Shield className="h-4 w-4" /> Open Admin
                </Link>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-border glass p-5">
              <div className="text-sm font-bold">Your account</div>
              <p className="mt-1 text-sm text-muted-foreground break-all">{user.email}</p>
            </div>
            <div className="rounded-3xl border border-border glass p-5">
              <div className="text-sm font-bold">Stay unscripted</div>
              <p className="mt-1 text-sm text-muted-foreground">Every session is a fresh page. Do less. Do it well.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
