import { useState } from "react";
import { toast } from "sonner";
import { Image as ImageIcon, Loader2, Plus, Trash2, User } from "lucide-react";
import { uploadSiteAsset } from "@/lib/site-api";
import {
  useHomeSlides, useSaveHomeSlide, useDeleteHomeSlide,
  useHomeStats, useSaveHomeStat, useDeleteHomeStat,
  useHomePosts, useSaveHomePost, useDeleteHomePost,
  type HomeSlide, type HomeStat, type HomePost,
} from "@/lib/home-sections";

type Sub = "slides" | "stats" | "posts";

export function HomeTab() {
  const [sub, setSub] = useState<Sub>("slides");
  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-2xl border border-border glass p-1 overflow-x-auto">
        {([
          { k: "slides", label: "Sliding images" },
          { k: "stats", label: "Graphs / stats" },
          { k: "posts", label: "Post cards" },
        ] as const).map((t) => (
          <button
            key={t.k}
            onClick={() => setSub(t.k)}
            className={`flex-1 min-w-[120px] rounded-xl px-3 py-2 text-sm font-semibold transition ${
              sub === t.k ? "gradient-primary text-primary-foreground btn-glow" : "hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {sub === "slides" && <SlidesPanel />}
      {sub === "stats" && <StatsPanel />}
      {sub === "posts" && <PostsPanel />}
    </div>
  );
}

/* ----------------------------- Slides ----------------------------- */

function SlidesPanel() {
  const { data: items = [], isLoading } = useHomeSlides();
  const save = useSaveHomeSlide();
  const del = useDeleteHomeSlide();
  const [editing, setEditing] = useState<Partial<HomeSlide> | null>(null);
  const [uploading, setUploading] = useState(false);

  if (isLoading) return <Loading />;

  const onFile = async (file: File | undefined) => {
    if (!file || !editing) return;
    setUploading(true);
    try {
      const url = await uploadSiteAsset(file, "misc");
      setEditing({ ...editing, image_url: url });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-4">
      <PanelHead
        count={`${items.length} slides`}
        label="Add slide"
        onAdd={() => setEditing({ caption: "", link: "", sort_order: 1000, enabled: true })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((s) => (
          <div key={s.id} className="rounded-2xl border border-border glass p-4 flex items-start gap-3">
            {s.image_url ? (
              <img src={s.image_url} alt="" className="h-16 w-24 rounded-xl object-cover border border-border" />
            ) : (
              <div className="h-16 w-24 rounded-xl border border-dashed border-border/60 grid place-items-center text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">{s.caption || "Untitled slide"}</div>
              <div className="text-xs text-muted-foreground truncate">{s.link || "no link"}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                order {s.sort_order} · {s.enabled ? "visible" : "hidden"}
              </div>
            </div>
            <RowActions
              onEdit={() => setEditing(s)}
              onDelete={async () => {
                if (!confirm("Delete this slide?")) return;
                try { await del.mutateAsync(s.id); toast.success("Deleted"); }
                catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
              }}
            />
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={editing.id ? "Edit slide" : "New slide"} onClose={() => setEditing(null)}>
          <div className="grid gap-3">
            <TextField label="Caption" value={editing.caption ?? ""} onChange={(v) => setEditing({ ...editing, caption: v })} />
            <TextField label="Link (optional)" value={editing.link ?? ""} onChange={(v) => setEditing({ ...editing, link: v })} placeholder="https://…" />
            <TextField label="Sort order (smaller = first)" value={String(editing.sort_order ?? 1000)} onChange={(v) => setEditing({ ...editing, sort_order: Number(v) || 0 })} />
            <ImageField label="Slide image" url={editing.image_url ?? null} uploading={uploading} onFile={onFile} onClear={() => setEditing({ ...editing, image_url: null })} />
            <Toggle label="Visible on home page" value={editing.enabled ?? true} onChange={(v) => setEditing({ ...editing, enabled: v })} />
          </div>
          <SaveBar
            pending={save.isPending}
            onCancel={() => setEditing(null)}
            onSave={async () => {
              try { await save.mutateAsync(editing); toast.success("Saved"); setEditing(null); }
              catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ----------------------------- Stats ----------------------------- */

function StatsPanel() {
  const { data: items = [], isLoading } = useHomeStats();
  const save = useSaveHomeStat();
  const del = useDeleteHomeStat();
  const [editing, setEditing] = useState<Partial<HomeStat> | null>(null);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <PanelHead
        count={`${items.length} stats`}
        label="Add stat"
        onAdd={() => setEditing({ label: "", value: 0, unit: "", caption: "", sort_order: 1000, enabled: true })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((s) => (
          <div key={s.id} className="rounded-2xl border border-border glass p-4 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">
                {s.label} — <span className="text-primary">{s.value}{s.unit}</span>
              </div>
              <div className="text-xs text-muted-foreground truncate">{s.caption}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                order {s.sort_order} · {s.enabled ? "visible" : "hidden"}
              </div>
            </div>
            <RowActions
              onEdit={() => setEditing(s)}
              onDelete={async () => {
                if (!confirm(`Delete "${s.label}"?`)) return;
                try { await del.mutateAsync(s.id); toast.success("Deleted"); }
                catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
              }}
            />
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={editing.id ? "Edit stat" : "New stat"} onClose={() => setEditing(null)}>
          <div className="grid gap-3">
            <TextField label="Label" value={editing.label ?? ""} onChange={(v) => setEditing({ ...editing, label: v })} placeholder="Materials" />
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Value" value={String(editing.value ?? 0)} onChange={(v) => setEditing({ ...editing, value: Number(v) || 0 })} />
              <TextField label="Unit / suffix" value={editing.unit ?? ""} onChange={(v) => setEditing({ ...editing, unit: v })} placeholder="+" />
            </div>
            <TextField label="Caption" value={editing.caption ?? ""} onChange={(v) => setEditing({ ...editing, caption: v })} />
            <TextField label="Sort order (smaller = first)" value={String(editing.sort_order ?? 1000)} onChange={(v) => setEditing({ ...editing, sort_order: Number(v) || 0 })} />
            <Toggle label="Visible on home page" value={editing.enabled ?? true} onChange={(v) => setEditing({ ...editing, enabled: v })} />
          </div>
          <SaveBar
            pending={save.isPending}
            onCancel={() => setEditing(null)}
            onSave={async () => {
              if (!editing.label) { toast.error("Label is required"); return; }
              try { await save.mutateAsync(editing); toast.success("Saved"); setEditing(null); }
              catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ----------------------------- Posts ----------------------------- */

function PostsPanel() {
  const { data: items = [], isLoading } = useHomePosts();
  const save = useSaveHomePost();
  const del = useDeleteHomePost();
  const [editing, setEditing] = useState<Partial<HomePost> | null>(null);
  const [uploading, setUploading] = useState(false);

  if (isLoading) return <Loading />;

  const onFile = async (file: File | undefined) => {
    if (!file || !editing) return;
    setUploading(true);
    try {
      const url = await uploadSiteAsset(file, "misc");
      setEditing({ ...editing, avatar_url: url });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-4">
      <PanelHead
        count={`${items.length} cards`}
        label="Add card"
        onAdd={() => setEditing({ name: "", role_title: "", bio: "", link: "", sort_order: 1000, enabled: true })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border glass p-4 flex items-start gap-3">
            {p.avatar_url ? (
              <img src={p.avatar_url} alt="" className="h-14 w-14 rounded-xl object-cover border border-border" />
            ) : (
              <div className="h-14 w-14 rounded-xl border border-dashed border-border/60 grid place-items-center text-muted-foreground">
                <User className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">{p.name}</div>
              <div className="text-xs text-primary truncate">{p.role_title}</div>
              <div className="text-xs text-muted-foreground line-clamp-2">{p.bio}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                order {p.sort_order} · {p.enabled ? "visible" : "hidden"}
              </div>
            </div>
            <RowActions
              onEdit={() => setEditing(p)}
              onDelete={async () => {
                if (!confirm(`Delete "${p.name}"?`)) return;
                try { await del.mutateAsync(p.id); toast.success("Deleted"); }
                catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
              }}
            />
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={editing.id ? "Edit card" : "New card"} onClose={() => setEditing(null)}>
          <div className="grid gap-3">
            <TextField label="Name" value={editing.name ?? ""} onChange={(v) => setEditing({ ...editing, name: v })} />
            <TextField label="Role / title" value={editing.role_title ?? ""} onChange={(v) => setEditing({ ...editing, role_title: v })} placeholder="Founder & Developer" />
            <TextArea label="Bio" value={editing.bio ?? ""} onChange={(v) => setEditing({ ...editing, bio: v })} />
            <TextField label="Link (optional)" value={editing.link ?? ""} onChange={(v) => setEditing({ ...editing, link: v })} placeholder="https://…" />
            <TextField label="Sort order (smaller = first)" value={String(editing.sort_order ?? 1000)} onChange={(v) => setEditing({ ...editing, sort_order: Number(v) || 0 })} />
            <ImageField label="Photo" url={editing.avatar_url ?? null} uploading={uploading} onFile={onFile} onClear={() => setEditing({ ...editing, avatar_url: null })} />
            <Toggle label="Visible on home page" value={editing.enabled ?? true} onChange={(v) => setEditing({ ...editing, enabled: v })} />
          </div>
          <SaveBar
            pending={save.isPending}
            onCancel={() => setEditing(null)}
            onSave={async () => {
              if (!editing.name) { toast.error("Name is required"); return; }
              try { await save.mutateAsync(editing); toast.success("Saved"); setEditing(null); }
              catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ----------------------------- Shared ----------------------------- */

function PanelHead({ count, label, onAdd }: { count: string; label: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm text-muted-foreground">{count}</div>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-4 py-2 text-sm font-semibold btn-glow active:scale-95 transition"
      >
        <Plus className="h-4 w-4" /> {label}
      </button>
    </div>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 flex-col gap-1">
      <button onClick={onEdit} className="rounded-lg px-3 py-1 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition">Edit</button>
      <button onClick={onDelete} className="rounded-lg px-3 py-1 text-xs hover:bg-destructive/10 hover:text-destructive transition inline-flex items-center gap-1">
        <Trash2 className="h-3 w-3" /> Delete
      </button>
    </div>
  );
}

function SaveBar({ pending, onCancel, onSave }: { pending: boolean; onCancel: () => void; onSave: () => void }) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <button onClick={onCancel} className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Cancel</button>
      <button
        onClick={onSave}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-5 py-2 text-sm font-semibold btn-glow disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save
      </button>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted transition"
    >
      <span>{label}</span>
      <span className={`h-5 w-9 rounded-full p-0.5 transition ${value ? "gradient-primary" : "bg-muted"}`}>
        <span className={`block h-4 w-4 rounded-full bg-background transition-transform ${value ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}

function Loading() {
  return (
    <div className="grid place-items-center py-16 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs tracking-widest text-muted-foreground">{label.toUpperCase()}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary transition"
      />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs tracking-widest text-muted-foreground">{label.toUpperCase()}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="mt-1.5 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary transition resize-y"
      />
    </label>
  );
}

function ImageField({ label, url, uploading, onFile, onClear }: { label: string; url: string | null; uploading: boolean; onFile: (f: File | undefined) => void; onClear: () => void }) {
  return (
    <div>
      <div className="text-xs tracking-widest text-muted-foreground uppercase">{label}</div>
      <div className="mt-1.5 flex items-center gap-3">
        {url ? (
          <img src={url} alt="" className="h-16 w-16 rounded-xl object-cover border border-border" />
        ) : (
          <div className="h-16 w-16 rounded-xl border border-dashed border-border/60 grid place-items-center text-muted-foreground">
            <ImageIcon className="h-4 w-4" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-xs font-semibold hover:bg-muted cursor-pointer transition">
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
            {uploading ? "Uploading…" : url ? "Replace" : "Upload"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {url && (
            <button onClick={onClear} className="text-xs text-muted-foreground hover:text-destructive text-left transition">Remove</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-3xl border border-border glass-strong p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-full h-8 w-8 grid place-items-center hover:bg-muted">×</button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
