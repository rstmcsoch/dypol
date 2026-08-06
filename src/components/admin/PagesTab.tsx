import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Image as ImageIcon, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { uploadSiteAsset } from "@/lib/site-api";
import {
  useSitePages, useSaveSitePage, useDeleteSitePage, type SitePage,
} from "@/lib/site-pages";

const KNOWN: Record<string, string> = {
  about: "/about",
  terms: "/terms",
  dmca: "/dmca",
  privacy: "/privacy",
};

export function PagesTab() {
  const { data: pages, isLoading } = useSitePages();
  const save = useSaveSitePage();
  const del = useDeleteSitePage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<SitePage>>({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!pages?.length) return;
    const current = pages.find((p) => p.id === selectedId) ?? pages[0];
    setSelectedId(current.id);
    setForm(current);
  }, [pages, selectedId]);

  if (isLoading) {
    return (
      <div className="grid place-items-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const update = <K extends keyof SitePage>(k: K, v: SitePage[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onSave = async () => {
    try {
      await save.mutateAsync(form);
      toast.success("Page saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadSiteAsset(file, "misc");
      update("hero_image_url", url);
      if (form.id) await save.mutateAsync({ id: form.id, hero_image_url: url });
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const insertImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadSiteAsset(file, "misc");
      update("body", `${form.body ?? ""}\n\n![](${url})\n`);
      toast.success("Image added to content — remember to save");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onNew = async () => {
    const slug = window.prompt("Page address (letters and dashes only), e.g. refund-policy");
    if (!slug) return;
    const clean = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    try {
      await save.mutateAsync({ slug: clean, title: "New page", sort_order: 100 });
      toast.success("Page created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create page");
    }
  };

  const onDelete = async (p: SitePage) => {
    if (!window.confirm(`Delete "${p.title}"? The page will stop showing content.`)) return;
    try {
      await del.mutateAsync(p.id);
      setSelectedId(null);
      toast.success("Page deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-3xl border border-border glass p-4 h-fit">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-widest text-muted-foreground">PAGES</h2>
          <button
            onClick={onNew}
            className="inline-flex items-center gap-1 rounded-full gradient-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold btn-glow active:scale-95 transition"
          >
            <Plus className="h-3 w-3" /> New
          </button>
        </div>
        <ul className="mt-3 space-y-1">
          {(pages ?? []).map((p) => {
            const active = p.id === selectedId;
            return (
              <li key={p.id}>
                <button
                  onClick={() => { setSelectedId(p.id); setForm(p); }}
                  className={`w-full text-left rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    active ? "gradient-primary text-primary-foreground btn-glow" : "hover:bg-muted"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" /> {p.title}
                  </span>
                  <span className={`block text-xs font-normal ${active ? "opacity-80" : "text-muted-foreground"}`}>
                    {KNOWN[p.slug] ?? `/${p.slug}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="rounded-3xl border border-border glass p-5 space-y-4">
        {!form.id ? (
          <p className="text-sm text-muted-foreground">No page selected.</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-bold">Edit page</h2>
              <div className="flex gap-2">
                {KNOWN[form.slug ?? ""] && (
                  <a
                    href={KNOWN[form.slug ?? ""]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted transition"
                  >
                    View page
                  </a>
                )}
                <button
                  onClick={() => onDelete(form as SitePage)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted hover:text-destructive transition"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>

            <Field label="Page address (slug)">
              <input
                value={form.slug ?? ""}
                onChange={(e) => update("slug", e.target.value)}
                className="input-base"
              />
            </Field>
            <Field label="Title">
              <input value={form.title ?? ""} onChange={(e) => update("title", e.target.value)} className="input-base" />
            </Field>
            <Field label="Subtitle">
              <input value={form.subtitle ?? ""} onChange={(e) => update("subtitle", e.target.value)} className="input-base" />
            </Field>

            <div>
              <div className="text-xs tracking-widest text-muted-foreground">COVER IMAGE</div>
              <div className="mt-1.5 flex items-center gap-3">
                {form.hero_image_url ? (
                  <img src={form.hero_image_url} alt="" className="h-16 w-28 rounded-xl object-cover border border-border" />
                ) : (
                  <div className="h-16 w-28 rounded-xl border border-dashed border-border/60 grid place-items-center text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-xs font-semibold hover:bg-muted cursor-pointer transition">
                    {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
                    {form.hero_image_url ? "Replace" : "Upload"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                  </label>
                  {form.hero_image_url && (
                    <button
                      onClick={() => update("hero_image_url", null)}
                      className="text-xs text-muted-foreground hover:text-destructive text-left transition"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <Field label="Content">
              <textarea
                value={form.body ?? ""}
                onChange={(e) => update("body", e.target.value)}
                rows={18}
                className="input-base font-mono text-xs leading-relaxed resize-y"
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              Formatting: <code className="rounded bg-muted px-1">## Heading</code>,{" "}
              <code className="rounded bg-muted px-1">- bullet</code>, blank line = new paragraph, and{" "}
              <code className="rounded bg-muted px-1">![](image-url)</code> on its own line for an image.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <label className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted cursor-pointer transition">
                <ImageIcon className="h-4 w-4" /> Add image to content
                <input type="file" accept="image/*" className="hidden" onChange={(e) => insertImage(e.target.files?.[0])} />
              </label>
              <button
                onClick={onSave}
                disabled={save.isPending}
                className="inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-5 py-2 text-sm font-semibold btn-glow active:scale-95 transition disabled:opacity-60"
              >
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save page
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs tracking-widest text-muted-foreground">{label.toUpperCase()}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
