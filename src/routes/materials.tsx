import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, BookOpen, FileText, Sparkles, Clock, ClipboardList, GraduationCap, Filter, ArrowRight, Lock } from "lucide-react";
import { MATERIALS, RESOURCE_TYPES, SUBJECTS } from "@/lib/data";

export const Route = createFileRoute("/materials")({
  head: () => ({
    meta: [
      { title: "Materials — Dypol" },
      { name: "description", content: "Curated books, notes, PYQs and modules — all in one launcher." },
    ],
  }),
  component: Materials,
});

const TYPE_ICONS: Record<string, typeof BookOpen> = {
  "Books": BookOpen,
  "Notes": FileText,
  "Crux / Summary": Sparkles,
  "PYQs": Clock,
  "Test Series": ClipboardList,
  "Coaching Modules": GraduationCap,
};

function Materials() {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [type, setType] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return MATERIALS.filter((m) => {
      if (q && !m.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (type && m.type !== type) return false;
      if (subjects.length) {
        const subj = m.subject.toLowerCase();
        const matches = subjects.some((s) => {
          if (s === "PCM Mix") return subj.includes("mix");
          return subj.includes(s.toLowerCase().slice(0, 4));
        });
        if (!matches) return false;
      }
      return true;
    });
  }, [subjects, type, q]);

  const toggleSubject = (s: string) =>
    setSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  return (
    <main className="px-4 md:px-8 pt-6 pb-16">
      <div className="mx-auto max-w-7xl grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-3xl border border-border glass p-5 h-fit lg:sticky lg:top-24">
          <div className="text-xs tracking-widest text-muted-foreground">REFINE</div>
          <div className="mt-1 flex items-center gap-2 text-xl font-bold">
            <Filter className="h-5 w-5 text-primary" /> Filters
          </div>

          <div className="mt-5">
            <div className="text-xs font-semibold text-muted-foreground mb-2">SUBJECTS</div>
            <div className="grid grid-cols-2 gap-2">
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSubject(s)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition active:scale-95 ${
                    subjects.includes(s)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="font-semibold">RESOURCE TYPE</span>
              <span>Single select</span>
            </div>
            <div className="space-y-1.5">
              {RESOURCE_TYPES.map((t) => {
                const Icon = TYPE_ICONS[t] ?? BookOpen;
                const active = type === t;
                return (
                  <button
                    key={t}
                    onClick={() => setType(active ? null : t)}
                    className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition ${
                      active ? "gradient-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {t}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section>
          <div className="rounded-2xl border border-border glass px-4 py-3 flex items-center gap-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search modules, PYQs, books, test series…"
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>

          <div className="mt-6 flex items-baseline gap-2">
            <div className="text-xs tracking-widest text-muted-foreground">RESULTS</div>
          </div>
          <div className="text-3xl font-bold">
            {filtered.length} <span className="text-muted-foreground text-lg font-normal italic">materials</span>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((m, i) => {
              const Icon = TYPE_ICONS[m.type] ?? BookOpen;
              return (
                <motion.article
                  key={m.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="group rounded-2xl border border-border glass p-5 hover:border-primary/50 hover:-translate-y-1 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      m.tier === "PREMIUM" ? "gradient-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}>
                      {m.tier === "PREMIUM" ? "★ PREMIUM" : "🔥 CORE"}
                    </span>
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 text-[10px] tracking-widest text-muted-foreground">
                    {m.subject} · JEE
                  </div>
                  <h3 className="mt-1 text-lg font-bold leading-tight">{m.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{m.desc}</p>
                  <div className="mt-3">
                    <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-xs">{m.type}</span>
                  </div>
                  {/* Empty image slot */}
                  <div data-slot={`material-${m.id}-image`} className="mt-4 aspect-video rounded-xl border border-dashed border-border/60 grid place-items-center text-[10px] text-muted-foreground">
                    image slot
                  </div>
                  {m.url ? (
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full gradient-primary text-primary-foreground py-2.5 font-semibold btn-glow hover:opacity-95 active:scale-95 transition"
                    >
                      Access Resource <ArrowRight className="h-4 w-4" />
                    </a>
                  ) : (
                    <button
                      disabled
                      title="Link coming soon"
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full gradient-primary text-primary-foreground py-2.5 font-semibold btn-glow opacity-70 cursor-not-allowed"
                    >
                      <Lock className="h-3.5 w-3.5" /> Access Resource <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </motion.article>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="mt-12 rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
              No materials match those filters.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
