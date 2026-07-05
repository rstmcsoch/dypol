import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera, LogOut, Save, Sparkles, Target, Calendar } from "lucide-react";
import { getUser, saveUser, clearUser, type DypolUser } from "@/lib/user";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Dypol" }] }),
  component: Profile,
});

const TARGETS = ["Creator", "Student", "Founder", "Athlete", "Artist", "Other"];

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<DypolUser | null>(null);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("Creator");

  useEffect(() => {
    const u = getUser();
    if (!u) {
      navigate({ to: "/welcome" });
      return;
    }
    setUser(u);
    setName(u.displayName);
    setTarget(u.target);
  }, [navigate]);

  if (!user) return null;

  const save = () => {
    const next = { ...user, displayName: name, target };
    saveUser(next);
    setUser(next);
  };
  const signOut = () => {
    clearUser();
    navigate({ to: "/welcome" });
  };
  const onAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const next = { ...user, avatarDataUrl: String(r.result) };
      saveUser(next);
      setUser(next);
    };
    r.readAsDataURL(f);
  };

  const initial = user.displayName?.[0]?.toUpperCase() ?? "?";

  return (
    <main className="px-4 md:px-8 pt-6 pb-16">
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl border border-border glass-strong p-6 md:p-8">
          <div aria-hidden className="absolute inset-0 -z-10 opacity-40 gradient-primary" />
          <div className="grid gap-6 md:grid-cols-[auto_1fr] items-center">
            <div className="relative">
              <div className="h-28 w-28 rounded-full gradient-primary grid place-items-center text-4xl font-black text-primary-foreground overflow-hidden">
                {user.avatarDataUrl ? (
                  <img src={user.avatarDataUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 grid h-10 w-10 place-items-center rounded-full glass-strong cursor-pointer hover:scale-110 active:scale-95 transition">
                <Camera className="h-4 w-4" />
                <input type="file" accept="image/*" onChange={onAvatar} className="hidden" />
              </label>
              <div className="mt-2 text-center text-xs text-muted-foreground">Upload photo</div>
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-0.5 text-xs font-semibold text-primary">
                <Sparkles className="h-3 w-3" /> {user.isGuest ? "GUEST ACCOUNT" : "MEMBER"}
              </div>
              <h1 className="mt-2 font-display text-5xl md:text-6xl font-black truncate">
                {user.displayName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Target className="h-4 w-4" /> {user.target}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> Joined{" "}
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[1.5fr_1fr]">
          <section className="rounded-3xl border border-border glass p-6">
            <h2 className="text-2xl font-bold">Edit profile</h2>
            <div className="mt-6">
              <label className="text-xs tracking-widest text-muted-foreground">DISPLAY NAME</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-border bg-transparent px-4 py-3 outline-none focus:border-primary transition"
              />
            </div>
            <div className="mt-5">
              <label className="text-xs tracking-widest text-muted-foreground">PATH</label>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TARGETS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTarget(t)}
                    className={`rounded-xl border py-2.5 text-sm font-semibold transition active:scale-95 ${
                      target === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={save}
                className="inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-5 py-2.5 font-semibold btn-glow active:scale-95 transition"
              >
                <Save className="h-4 w-4" /> Save changes
              </button>
              <button
                onClick={signOut}
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 font-semibold hover:bg-muted active:scale-95 transition"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-border glass p-5">
              <div className="text-sm font-bold">Saved progress</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Your favorites and choices live on this device.
              </p>
            </div>
            <div className="rounded-3xl border border-border glass p-5">
              <div className="text-sm font-bold">Stay unscripted</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Every session is a fresh page. Do less. Do it well.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
