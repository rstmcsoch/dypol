import { useState } from "react";
import { Loader2, Plus, Trash2, Save, ArrowUp, ArrowDown, Eye, EyeOff, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  useExams, useExamYears, useSaveExam, useSaveExamYear, useSaveExamYearRow,
  useDeleteExamYear, useDeleteExam, useExamUsage, slugifyExamName,
  type Exam,
} from "@/lib/taxonomy";

/**
 * Admin-controlled exam list: add / edit / disable / re-enable / reorder /
 * remove-where-safe, plus per-exam preparation years.
 */
export default function ExamsTab() {
  const { data: exams = [], isLoading } = useExams();
  const { data: years = [] } = useExamYears();
  const saveExam = useSaveExam();
  const saveYear = useSaveExamYear();
  const saveYearRow = useSaveExamYearRow();
  const deleteYear = useDeleteExamYear();
  const deleteExam = useDeleteExam();

  const [editing, setEditing] = useState<Partial<Exam> | null>(null);
  const [addingYearFor, setAddingYearFor] = useState<string | null>(null);
  const [newYear, setNewYear] = useState<string>("");
  const [pendingDelete, setPendingDelete] = useState<Exam | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const yearsFor = (examId: string) =>
    years.filter((y) => y.exam_id === examId).sort((a, b) => a.year - b.year);

  const move = async (exam: Exam, dir: -1 | 1) => {
    const sorted = [...exams].sort((a, b) => a.sort_order - b.sort_order);
    const i = sorted.findIndex((e) => e.id === exam.id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const other = sorted[j];
    try {
      await saveExam.mutateAsync({ id: exam.id, sort_order: other.sort_order });
      await saveExam.mutateAsync({ id: other.id, sort_order: exam.sort_order });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reorder failed");
    }
  };

  const toggle = async (exam: Exam) => {
    try {
      await saveExam.mutateAsync({ id: exam.id, enabled: !exam.enabled });
      toast.success(exam.enabled ? "Exam disabled" : "Exam re-enabled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const submitExam = async () => {
    if (!editing?.name?.trim()) {
      toast.error("Exam name is required");
      return;
    }
    try {
      await saveExam.mutateAsync({
        ...editing,
        slug: editing.id ? editing.slug : slugifyExamName(editing.name),
      });
      toast.success("Exam saved");
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const submitYear = async () => {
    const year = Number(newYear);
    if (!addingYearFor || !Number.isInteger(year) || year < 2000 || year > 2100) {
      toast.error("Enter a valid year (2000–2100)");
      return;
    }
    try {
      await saveYear.mutateAsync({ examId: addingYearFor, year });
      toast.success("Year added");
      setNewYear("");
      setAddingYearFor(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Year already exists or save failed");
    }
  };

  const removeYear = async (id: string, year: number) => {
    if (!confirm(`Stop offering ${year} for this exam? Users who already selected it keep their choice.`)) return;
    try {
      await deleteYear.mutateAsync(id);
      toast.success("Year removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {exams.length} exams · used across onboarding, user filters, profiles and materials.
          Disabling an exam never deletes users or materials attached to it.
        </p>
        <button
          onClick={() => setEditing({ name: "", enabled: true, sort_order: (exams.at(-1)?.sort_order ?? 0) + 10 })}
          className="inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-4 py-2 text-sm font-semibold btn-glow active:scale-95 transition"
        >
          <Plus className="h-4 w-4" /> Add exam
        </button>
      </div>

      <ul className="grid gap-3">
        {exams.map((exam) => {
          const yrs = yearsFor(exam.id);
          return (
            <li key={exam.id} className="rounded-2xl border border-border glass p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-primary text-primary-foreground font-black">
                  {(exam.name[0] ?? "?").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate flex items-center gap-2 flex-wrap">
                    {exam.name}
                    {!exam.enabled && (
                      <span className="text-[10px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground font-bold">DISABLED</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">/{exam.slug}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => move(exam, -1)} title="Move up" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted transition"><ArrowUp className="h-4 w-4" /></button>
                  <button onClick={() => move(exam, 1)} title="Move down" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted transition"><ArrowDown className="h-4 w-4" /></button>
                  <button onClick={() => toggle(exam)} title={exam.enabled ? "Disable" : "Enable"} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted transition">
                    {exam.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button onClick={() => setEditing(exam)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-primary/10 hover:text-primary transition" title="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPendingDelete(exam)}
                    className="grid h-8 w-8 place-items-center rounded-lg hover:bg-destructive/10 hover:text-destructive transition"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] tracking-widest text-muted-foreground mr-1">YEARS</span>
                {yrs.length === 0 && <span className="text-xs text-muted-foreground italic">none yet</span>}
                {yrs.map((y) => (
                  <span
                    key={y.id}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      y.enabled ? "border-border" : "border-border text-muted-foreground opacity-60"
                    }`}
                  >
                    <button
                      onClick={() => saveYearRow.mutate({ id: y.id, enabled: !y.enabled })}
                      title={y.enabled ? "Disable year" : "Enable year"}
                    >
                      {y.year}
                    </button>
                    <button
                      onClick={() => removeYear(y.id, y.year)}
                      aria-label={`Remove ${y.year}`}
                      className="grid h-4 w-4 place-items-center rounded-full hover:bg-destructive/15 hover:text-destructive transition"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {addingYearFor === exam.id ? (
                  <span className="inline-flex items-center gap-1">
                    <input
                      autoFocus
                      type="number"
                      value={newYear}
                      onChange={(e) => setNewYear(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") submitYear(); if (e.key === "Escape") setAddingYearFor(null); }}
                      placeholder="2029"
                      className="w-20 rounded-full border border-border bg-transparent px-3 py-1 text-xs outline-none focus:border-primary transition"
                    />
                    <button onClick={submitYear} className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition"><Save className="h-3 w-3" /></button>
                    <button onClick={() => setAddingYearFor(null)} className="grid h-6 w-6 place-items-center rounded-full hover:bg-muted transition"><X className="h-3 w-3" /></button>
                  </span>
                ) : (
                  <button
                    onClick={() => { setAddingYearFor(exam.id); setNewYear(""); }}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/50 transition"
                  >
                    <Plus className="h-3 w-3" /> year
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Add / edit exam */}
      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Edit exam" : "New exam"}>
          <div className="grid gap-3">
            <Field label="EXAM NAME">
              <input
                autoFocus
                value={editing.name ?? ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. JEE Advanced"
                className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary transition"
              />
            </Field>
            {!editing.id && (
              <Field label="SLUG (URL ID — AUTO)">
                <input
                  value={slugifyExamName(editing.name ?? "")}
                  readOnly
                  className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm outline-none text-muted-foreground"
                />
              </Field>
            )}
            <Field label="SORT ORDER">
              <input
                type="number"
                value={editing.sort_order ?? 100}
                onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })}
                className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary transition"
              />
            </Field>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!editing.enabled}
                onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
              />
              Enabled (offered during onboarding and filtering)
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Cancel</button>
            <button
              onClick={submitExam}
              disabled={saveExam.isPending}
              className="inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-5 py-2 text-sm font-semibold btn-glow disabled:opacity-60"
            >
              {saveExam.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
          </div>
        </Modal>
      )}

      {/* Delete exam (safe check) */}
      {pendingDelete && <DeleteExamModal exam={pendingDelete} onClose={() => setPendingDelete(null)} />}
    </div>
  );
}

function DeleteExamModal({ exam, onClose }: { exam: Exam; onClose: () => void }) {
  const { data: usage, isLoading } = useExamUsage(exam.id);
  const deleteExam = useDeleteExam();
  const [busy, setBusy] = useState(false);

  const inUse = !!usage && (usage.users > 0 || usage.materials > 0);

  return (
    <Modal onClose={onClose} title={`Delete “${exam.name}”?`}>
      {isLoading ? (
        <div className="flex justify-center py-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {inUse ? (
              <>
                This exam is attached to{" "}
                <strong className="text-foreground">{usage.users} users</strong> and{" "}
                <strong className="text-foreground">{usage.materials} materials</strong>. Deleting it would break
                those links, so deletion is blocked. Disable it instead — existing users and materials stay intact.
              </>
            ) : (
              <>Nothing references this exam. You can safely delete it, or just disable it to hide it everywhere.</>
            )}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Cancel</button>
            <button
              onClick={async () => {
                setBusy(true);
                try {
                  await deleteExam.mutateAsync(exam.id);
                  toast.success("Exam deleted");
                  onClose();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Delete failed");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={inUse || busy}
              className="inline-flex items-center gap-2 rounded-full bg-destructive/10 border border-destructive/40 text-destructive px-5 py-2 text-sm font-semibold hover:bg-destructive/15 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl border border-border glass-strong p-5 sm:p-6 max-h-[min(90dvh,calc(100dvh-2rem))] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted transition active:scale-90">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
