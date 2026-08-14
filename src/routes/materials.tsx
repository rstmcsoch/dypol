import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  BookOpen,
  Filter,
  Settings,
  GraduationCap,
  X,
} from "lucide-react";
import { materialsPageQO } from "@/lib/site-api";
import { useAuth } from "@/hooks/use-auth";
import { useExams, useEnabledSubjects, useEnabledResourceTypes } from "@/lib/taxonomy";
import { TYPE_ICONS } from "@/lib/type-icons";
import { MaterialCard } from "@/components/MaterialCard";

export const Route = createFileRoute("/materials")({
  head: () => ({
    meta: [
      { title: "Materials — Dypol" },
      { name: "description", content: "Curated books, notes, PYQs and modules — all in one launcher." },
    ],
  }),
  ssr: false,
  component: Materials,
});

const PAGE_SIZE = 12;

function Materials() {
  const { isAdmin } = useAuth();
  const exams = useExams();
  const subjects = useEnabledSubjects();
  const resourceTypes = useEnabledResourceTypes();

  const [examId, setExamId] = useState<string | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [type, setType] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);

  // Debounced search — no query per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const filters = useMemo(
    () => ({ examId, subjects: selectedSubjects, type, q: debouncedQ, page, pageSize: PAGE_SIZE }),
    [examId, selectedSubjects, type, debouncedQ, page],
  );

  const { data, isFetching, isLoading } = useQuery(materialsPageQO(filters));

  const examNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of exams.data ?? []) map.set(e.id, e.name);
    return map;
  }, [exams.data]);

  const examOf = (id: string | null) => (id ? examNames.get(id) : undefined);

  const toggleSubject = (s: string) => {
    setPage(1);
    setSelectedSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const pickExam = (id: string | null) => {
    setPage(1);
    setExamId(id);
  };

  const pickType = (t: string | null) => {
    setPage(1);
    setType(t);
  };

  const resetAll = () => {
    setQ("");
    setDebouncedQ("");
    setExamId(null);
    setSelectedSubjects([]);
    setType(null);
    setPage(1);
  };

  const activeFilterCount =
    (examId ? 1 : 0) + selectedSubjects.length + (type ? 1 : 0) + (debouncedQ ? 1 : 0);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <main className="px-4 md:px-8 pt-6 pb-8">
      <div className="mx-auto max-w-7xl grid gap-6 lg:grid-cols-[280px_1fr] min-w-0">
        <aside className="rounded-3xl border border-border glass p-5 h-fit lg:sticky lg:top-24">
          <div className="text-xs tracking-widest text-muted-foreground">REFINE</div>
          <div className="mt-1 flex items-center gap-2 text-xl font-bold">
            <Filter className="h-5 w-5 text-primary" /> Filters
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="font-semibold">EXAM</span>
              <span>Single select</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => pickExam(null)}
                className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
                  examId === null ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                }`}
              >
                All
              </button>
              {(exams.data ?? []).map((e) => (
                <button
                  key={e.id}
                  onClick={() => pickExam(e.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
                    examId === e.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                  }`}
                >
                  <GraduationCap className="h-3.5 w-3.5" /> {e.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <div className="text-xs font-semibold text-muted-foreground mb-2">SUBJECTS</div>
            <div className="grid grid-cols-2 gap-2">
              {subjects.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSubject(s)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition active:scale-95 ${
                    selectedSubjects.includes(s)
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
              {resourceTypes.map((t) => {
                const Icon = TYPE_ICONS[t] ?? BookOpen;
                const active = type === t;
                return (
                  <button
                    key={t}
                    onClick={() => pickType(active ? null : t)}
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

          {activeFilterCount > 0 && (
            <button
              onClick={resetAll}
              className="mt-5 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-sm font-semibold hover:bg-muted active:scale-95 transition"
            >
              <X className="h-4 w-4" /> Clear all filters
            </button>
          )}
        </aside>

        <section className="min-w-0">
          <div className="rounded-2xl border border-border glass px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3 min-w-0">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search modules, PYQs, books, test series…"
              className="min-w-0 flex-1 bg-transparent outline-none text-sm"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                aria-label="Clear search"
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 rounded-full gradient-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 btn-glow active:scale-95 transition"
              >
                <Settings className="h-3.5 w-3.5" /> Edit
              </Link>
            )}
          </div>

          <div className="mt-6 flex items-baseline gap-2">
            <div className="text-xs tracking-widest text-muted-foreground">RESULTS</div>
            {isFetching && <span className="text-xs text-muted-foreground animate-pulse">updating…</span>}
          </div>
          <div className="text-3xl font-bold">
            {total} <span className="text-muted-foreground text-lg font-normal italic">materials</span>
          </div>

          {isLoading ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border glass p-4 sm:p-5 animate-pulse">
                  <div className="flex items-start justify-between">
                    <div className="h-5 w-20 rounded-full bg-muted" />
                    <div className="h-10 w-10 rounded-xl bg-muted" />
                  </div>
                  <div className="mt-4 h-3 w-24 rounded bg-muted" />
                  <div className="mt-2 h-6 w-3/4 rounded bg-muted" />
                  <div className="mt-3 h-4 w-full rounded bg-muted" />
                  <div className="mt-2 h-4 w-2/3 rounded bg-muted" />
                  <div className="mt-4 aspect-video w-full rounded-xl bg-muted" />
                  <div className="mt-4 flex gap-2">
                    <div className="h-10 flex-1 rounded-full bg-muted" />
                    <div className="h-10 w-10 rounded-full bg-muted" />
                  </div>
                  <div className="mt-3 flex justify-between">
                    <div className="h-9 w-20 rounded-full bg-muted" />
                    <div className="h-9 w-9 rounded-full bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 items-stretch">
                {items.map((m, i) => (
                  <MaterialCard key={m.id} material={m} examName={examOf(m.exam_id)} index={i} />
                ))}
              </div>
              {!isLoading && items.length === 0 && (
                <div className="mt-12 rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
                  No materials match those filters.
                </div>
              )}
              {data?.hasMore && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={isFetching}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-semibold hover:bg-muted active:scale-95 transition disabled:opacity-60"
                  >
                    {isFetching ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
