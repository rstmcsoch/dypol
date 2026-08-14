import { useState } from "react";
import { Loader2, Plus, Trash2, Save, ArrowUp, ArrowDown, Eye, EyeOff, X, Pencil, Tags } from "lucide-react";
import { toast } from "sonner";
import {
  useMaterialFilters, useSaveMaterialFilter, useDeleteMaterialFilter, useFilterUsage,
  type MaterialFilter,
} from "@/lib/taxonomy";

/**
 * Admin-controlled material filters: subjects and resource types.
 * Renaming / disabling / removing never deletes attached materials —
 * usage checks protect destructive removals.
 */
export default function FiltersTab() {
  const { data: filters = [], isLoading } = useMaterialFilters();
  const saveFilter = useSaveMaterialFilter();
  const deleteFilter = useDeleteMaterialFilter();

  const [editing, setEditing] = useState<Partial<MaterialFilter> | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MaterialFilter | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const listFor = (kind: "subject" | "type") => filters.filter((f) => f.kind === kind);

  const move = async (item: MaterialFilter, dir: -1 | 1) => {
    const group = listFor(item.kind);
    const i = group.findIndex((f) => f.id === item.id);
    const j = i + dir;
    if (j < 0 || j >= group.length) return;
    const other = group[j];
    try {
      await saveFilter.mutateAsync({ id: item.id, sort_order: other.sort_order });
      await saveFilter.mutateAsync({ id: other.id, sort_order: item.sort_order });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reorder failed");
    }
  };

  const toggle = async (item: MaterialFilter) => {
    try {
      await saveFilter.mutateAsync({ id: item.id, enabled: !item.enabled });
      toast.success(item.enabled ? "Filter disabled" : "Filter re-enabled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const submit = async () => {
    if (!editing?.name?.trim()) {
      toast.error("Filter name is required");
      return;
    }
    try {
      await saveFilter.mutateAsync(editing);
      toast.success("Filter saved");
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const renderGroup = (kind: "subject" | "type", title: string, hint: string) => (
    <section className="rounded-3xl border border-border glass p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Tags className="h-5 w-5 text-primary" /> {title}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        </div>
        <button
          onClick={() =>
            setEditing({
              kind,
              name: "",
              enabled: true,
              sort_order: (listFor(kind).at(-1)?.sort_order ?? 0) + 10,
            })
          }
          className="inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-4 py-2 text-sm font-semibold btn-glow active:scale-95 transition"
        >
          <Plus className="h-4 w-4" /> Add {kind === "subject" ? "subject" : "type"}
        </button>
      </div>

      <ul className="mt-4 grid gap-2">
        {listFor(kind).map((f) => (
          <li key={f.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate flex items-center gap-2 flex-wrap">
                {f.name}
                {!f.enabled && (
                  <span className="text-[10px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground font-bold">DISABLED</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">order {f.sort_order}</div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => move(f, -1)} title="Move up" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted transition"><ArrowUp className="h-4 w-4" /></button>
              <button onClick={() => move(f, 1)} title="Move down" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted transition"><ArrowDown className="h-4 w-4" /></button>
              <button onClick={() => toggle(f)} title={f.enabled ? "Disable" : "Enable"} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted transition">
                {f.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button onClick={() => setEditing(f)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-primary/10 hover:text-primary transition" title="Rename">
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPendingDelete(f)}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-destructive/10 hover:text-destructive transition"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        These lists power the Materials filters and the admin material editor. Disabling or removing a filter
        never deletes the materials attached to it.
      </p>
      {renderGroup("subject", "Subjects", "Shown as subject chips on the Materials page.")}
      {renderGroup("type", "Resource types", "Shown as the resource-type list on the Materials page.")}

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Rename filter" : "New filter"}>
          <div className="grid gap-3">
            <Field label={editing.kind === "subject" ? "SUBJECT NAME" : "RESOURCE TYPE NAME"}>
              <input
                autoFocus
                value={editing.name ?? ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder={editing.kind === "subject" ? "e.g. Biology" : "e.g. Handwritten Notes"}
                className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary transition"
              />
            </Field>
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
              Enabled
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Cancel</button>
            <button
              onClick={submit}
              disabled={saveFilter.isPending}
              className="inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-5 py-2 text-sm font-semibold btn-glow disabled:opacity-60"
            >
              {saveFilter.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
          </div>
        </Modal>
      )}

      {pendingDelete && <DeleteFilterModal filter={pendingDelete} onClose={() => setPendingDelete(null)} />}
    </div>
  );
}

function DeleteFilterModal({ filter, onClose }: { filter: MaterialFilter; onClose: () => void }) {
  const { data: usage, isLoading } = useFilterUsage(filter.id);
  const deleteFilter = useDeleteMaterialFilter();
  const [busy, setBusy] = useState(false);

  const count = usage?.materials ?? 0;

  return (
    <Modal onClose={onClose} title={`Delete “${filter.name}”?`}>
      {isLoading ? (
        <div className="flex justify-center py-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {count > 0 ? (
              <>
                <strong className="text-foreground">{count} materials</strong> use this{" "}
                {filter.kind === "subject" ? "subject" : "type"}. Removing it would orphan their filter values, so
                deletion is blocked — disable it instead, or reassign those materials first.
              </>
            ) : (
              <>Nothing references this filter. You can safely delete it.</>
            )}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Cancel</button>
            <button
              onClick={async () => {
                setBusy(true);
                try {
                  await deleteFilter.mutateAsync(filter.id);
                  toast.success("Filter deleted");
                  onClose();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Delete failed");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={count > 0 || busy}
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
