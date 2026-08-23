import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LogOut, Save, Sparkles, Target, Calendar, Loader2, Shield, BookmarkCheck, Trash2, ExternalLink, Bookmark as BookmarkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

import { useBookmarks, useDeleteBookmark } from "@/lib/bookmarks";
import { SubmitMaterial } from "@/components/profile/SubmitMaterial";
import { DIO_TX_LABEL, formatDio, useDioBalance, useDioHistory } from "@/lib/dio";
import { DioStar } from "@/components/dio/DioBits";
import { useOnboardingOptions } from "@/lib/account";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Dypol" }] }),
  ssr: false,
  component: Profile,
});

interface ProfileRow {
  id: string;
  display_name: string | null;
  target: string | null;
  avatar_url: string | null;
  created_at: string;
  selected_exam: string | null;
  preparation_year: number | null;
}

/** "Today" / "Yesterday" / "Aug 5" — calm relative dates for the Dio history list. */
function relativeDay(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Profile() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [name, setName] = useState("");
  const [examSlug, setExamSlug] = useState<string>("");
  const [year, setYear] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: bookmarks = [], isLoading: bmLoading } = useBookmarks(user?.id);
  const delBookmark = useDeleteBookmark(user?.id);
  const { data: dioBalance } = useDioBalance(user?.id);
  const { data: dioTxs = [], isLoading: dioLoading } = useDioHistory(user?.id);
  const { data: options } = useOnboardingOptions();

  const exams = useMemo(() => options?.exams ?? [], [options]);
  const selectedExam = exams.find((e) => e.slug === examSlug);
  const years = selectedExam?.years ?? [];
  const targetLabel = selectedExam && year ? `${selectedExam.name} ${year}` : "Not set yet";

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setProfile(data as ProfileRow);
      setName(data.display_name ?? user.email?.split("@")[0] ?? "");
      setExamSlug(data.selected_exam ?? "");
      setYear(data.preparation_year ?? null);
    });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="min-h-[60vh] grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const save = async () => {
    if (!examSlug || year == null) {
      toast.error("Pick your exam and preparation year");
      return;
    }
    setBusy(true);
    try {
      const { data: onboardingData, error: onboardingError } = await supabase.rpc(
        "complete_onboarding",
        { _exam_slug: examSlug, _year: year },
      );
      if (onboardingError) throw onboardingError;
      const onboarding = (onboardingData ?? {}) as { ok?: boolean; error?: string };
      if (!onboarding.ok) throw new Error(onboarding.error ?? "Could not update exam settings");

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ display_name: name.trim().slice(0, 100) })
        .eq("id", user.id);
      if (profileError) throw profileError;
      toast.success("Profile saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally { setBusy(false); }
  };

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); };

  const initial = (name || user.email || "?")[0]?.toUpperCase();
  const joined = profile?.created_at ?? user.created_at;

  return (
    <main className="px-4 md:px-8 pt-6 pb-8">
      <div className="mx-auto max-w-5xl min-w-0">
        <div className="relative overflow-hidden rounded-3xl border border-border glass-strong p-5 sm:p-6 md:p-8">
          <div aria-hidden className="absolute inset-0 -z-10 opacity-40 gradient-primary" />
          <div className="flex flex-col items-center text-center gap-4 md:grid md:grid-cols-[auto_1fr] md:items-center md:text-left md:gap-6">
            <div className="relative shrink-0">
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full gradient-primary grid place-items-center text-4xl font-black text-primary-foreground overflow-hidden">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initial}
              </div>
            </div>
            <div className="min-w-0 w-full">
              <div className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-0.5 text-xs font-semibold text-primary">
                {isAdmin ? <><Shield className="h-3 w-3" /> ADMIN</> : <><Sparkles className="h-3 w-3" /> MEMBER</>}
              </div>
              <h1 className="mt-2 font-display font-black tracking-tight text-[clamp(1.65rem,7vw,3.5rem)] break-words">
                {name || user.email}
              </h1>
              <Link
                to="/earnDio"
                title="Your Dio balance — tap to earn more"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#e8b23a]/40 bg-[#e8b23a]/10 px-3.5 py-1.5 text-sm font-bold transition hover:border-[#e8b23a]/70 hover:bg-[#e8b23a]/15 active:scale-95"
              >
                <DioStar className="text-sm" />
                <span className="tabular-nums">{formatDio(dioBalance ?? 0)}</span>
                <span className="text-xs font-medium text-muted-foreground">Dio</span>
              </Link>
              <div className="mt-3 flex flex-col items-center gap-1.5 text-sm text-muted-foreground md:items-start sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1">
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <Target className="h-4 w-4 shrink-0" /> <span className="break-words">{targetLabel}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <Calendar className="h-4 w-4 shrink-0" /> <span className="break-words">Joined {new Date(joined).toLocaleDateString()}</span>
                </span>
              </div>
            </div>
          </div>
        </div>




        <div className="mt-6 grid gap-6 md:grid-cols-[1.5fr_1fr] min-w-0">
          <section className="rounded-3xl border border-border glass p-5 sm:p-6 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold">Edit profile</h2>
            <div className="mt-6">
              <label className="text-xs tracking-widest text-muted-foreground">DISPLAY NAME</label>
              <input value={name} maxLength={100} onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full min-w-0 rounded-2xl border border-border bg-transparent px-4 py-3 outline-none focus:border-primary transition" />
            </div>
            <div className="mt-5">
              <label className="text-xs tracking-widest text-muted-foreground">EXAM</label>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {exams.map((e) => (
                  <button key={e.slug} onClick={() => { setExamSlug(e.slug); setYear(null); }}
                    className={`min-w-0 rounded-xl border px-2 py-2.5 text-sm font-semibold transition active:scale-95 ${
                      examSlug === e.slug ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                    }`}>
                    {e.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5">
              <label className="text-xs tracking-widest text-muted-foreground">PREPARATION YEAR</label>
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2">
                {years.map((y) => (
                  <button key={y} onClick={() => setYear(y)}
                    className={`min-w-0 rounded-xl border px-2 py-2.5 text-sm font-semibold transition active:scale-95 ${
                      year === y ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                    }`}>
                    {y}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 min-[400px]:grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <button onClick={save} disabled={busy}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full gradient-primary text-primary-foreground px-5 py-2.5 font-semibold btn-glow active:scale-95 transition disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
              </button>
              <button onClick={signOut}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 font-semibold hover:bg-muted active:scale-95 transition">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
              {isAdmin && (
                <Link to="/admin" className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-primary text-primary px-5 py-2.5 font-semibold hover:bg-primary/10 active:scale-95 transition min-[400px]:col-span-2 sm:col-auto">
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

        {/* Dio history */}
        <section className="mt-8 rounded-3xl border border-border glass p-5 sm:p-6 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="min-w-0">
              <div className="text-xs tracking-widest text-[#e8b23a]">✦ DIO</div>
              <h2 className="mt-1 text-xl sm:text-2xl font-bold">Dio history</h2>
            </div>
            <Link to="/earnDio" className="inline-flex items-center gap-1.5 rounded-full border border-[#e8b23a]/40 bg-[#e8b23a]/10 px-4 py-2 text-sm font-semibold transition hover:bg-[#e8b23a]/15 active:scale-95">
              <DioStar /> Earn Dio
            </Link>
          </div>

          {dioLoading ? (
            <div className="mt-8 flex justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : dioTxs.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No Dio activity yet. Complete a sponsored activity on the Earn Dio page to get started.
            </div>
          ) : (
            <ul className="mt-5 space-y-2">
              {dioTxs.map((t) => (
                <li key={t.id} className="flex items-center gap-2 sm:gap-3 rounded-2xl border border-border px-3 sm:px-4 py-3 min-w-0">
                  <span className={`shrink-0 font-bold tabular-nums ${t.amount > 0 ? "text-[#e8b23a]" : "text-muted-foreground"}`}>
                    ✦ {t.amount > 0 ? `+${formatDio(t.amount)}` : `−${formatDio(Math.abs(t.amount))}`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{t.reason || DIO_TX_LABEL[t.type] || t.type}</div>
                    <div className="text-xs text-muted-foreground">
                      {DIO_TX_LABEL[t.type] ?? t.type} · {relativeDay(t.created_at)}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground" title="Balance after this transaction">
                    → ✦ {formatDio(t.balance_after)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Bookmarks */}
        <section className="mt-8 rounded-3xl border border-border glass p-5 sm:p-6 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="min-w-0">
              <div className="text-xs tracking-widest text-primary">✦ SAVED</div>
              <h2 className="mt-1 text-xl sm:text-2xl font-bold flex items-center gap-2">
                <BookmarkCheck className="h-6 w-6 shrink-0 text-primary" /> Your bookmarks
              </h2>
            </div>
            <div className="text-sm text-muted-foreground">
              {bookmarks.length} saved
            </div>
          </div>

          {bmLoading ? (
            <div className="mt-8 flex justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              <BookmarkIcon className="mx-auto h-6 w-6 mb-2" />
              Nothing saved yet. Tap the bookmark icon on any material or portal to save it here.
            </div>
          ) : (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {bookmarks.map((b) => (
                <li
                  key={b.id}
                  className="group flex items-center gap-3 rounded-2xl border border-border p-3 hover:border-primary/50 transition"
                >
                  {b.image_url ? (
                    <img src={b.image_url} alt="" className="h-12 w-12 rounded-xl object-cover border border-border" />
                  ) : (
                    <div className="h-12 w-12 rounded-xl gradient-primary grid place-items-center text-primary-foreground font-bold">
                      {b.title[0]?.toUpperCase() ?? "★"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] tracking-widest text-muted-foreground uppercase">{b.kind}</div>
                    <div className="font-semibold truncate">{b.title}</div>
                    {b.subtitle && <div className="text-xs text-muted-foreground truncate">{b.subtitle}</div>}
                  </div>
                  {b.url && (
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted text-muted-foreground hover:text-primary transition active:scale-90"
                      title="Open"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    onClick={() => delBookmark.mutate(b.id)}
                    className="grid h-9 w-9 place-items-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition active:scale-90"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <SubmitMaterial userId={user.id} />
      </div>
    </main>
  );
}
