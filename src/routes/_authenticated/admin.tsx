import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Loader2, Plus, Trash2, Save, LogOut, Image as ImageIcon, ExternalLink,
  ArrowLeft, Sparkles, Layers, Settings2, ShieldAlert, Menu as MenuIcon,
  ArrowUp, ArrowDown, Eye, EyeOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  useMaterials, usePortals, useSiteSettings,
  useSaveMaterial, useDeleteMaterial,
  useSavePortal, useDeletePortal,
  useSaveSiteSettings, uploadSiteAsset,
  type Material, type Portal, type SiteSettings,
} from "@/lib/site-api";
import { useNavItems, useSaveNavItem, useDeleteNavItem, type NavItem } from "@/lib/nav-items";
import { NAV_ICON_NAMES, getNavIcon } from "@/lib/nav-icons";
import { RESOURCE_TYPES, TIERS } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Dypol" }] }),
  component: Admin,
});

type Tab = "site" | "materials" | "portals" | "navigation" | "account";


function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("site");

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <main className="px-4 pt-10 pb-16">
        <div className="mx-auto max-w-lg rounded-3xl border border-border glass-strong p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-black">Admin only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account ({user?.email}) doesn't have admin access yet. Ask the site owner to grant your account the
            <code className="mx-1 rounded bg-muted px-1.5 py-0.5">admin</code> role.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link to="/" className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted">
              Home
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              className="rounded-full gradient-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold btn-glow"
            >
              Sign out
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 md:px-8 pt-6 pb-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition">
              <ArrowLeft className="h-3 w-3" /> Back to site
            </Link>
            <h1 className="mt-1 font-display text-4xl md:text-5xl font-black">Admin</h1>
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="text-foreground font-semibold">{user?.email}</span>
            </p>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted active:scale-95 transition"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>

        <div className="mt-6 flex gap-1 rounded-2xl border border-border glass p-1 overflow-x-auto">
          {[
            { k: "site", label: "Site", icon: Settings2 },
            { k: "materials", label: "Materials", icon: Layers },
            { k: "portals", label: "Portals", icon: Sparkles },
            { k: "navigation", label: "Navigation", icon: MenuIcon },
            { k: "account", label: "Account", icon: LogOut },
          ].map((t) => {
            const active = tab === t.k;
            const Icon = t.icon;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k as Tab)}
                className={`flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  active ? "gradient-primary text-primary-foreground btn-glow" : "hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          {tab === "site" && <SiteTab />}
          {tab === "materials" && <MaterialsTab />}
          {tab === "portals" && <PortalsTab />}
          {tab === "navigation" && <NavigationTab />}
          {tab === "account" && <AccountTab />}
        </div>

      </div>
    </main>
  );
}

/* ================== SITE ================== */

function SiteTab() {
  const { data: settings, isLoading } = useSiteSettings();
  const save = useSaveSiteSettings();
  const [form, setForm] = useState<Partial<SiteSettings>>({});
  const [uploading, setUploading] = useState<"logo" | "hero" | null>(null);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (isLoading || !settings) return <Loading />;

  const update = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onFile = async (folder: "logo" | "hero", file: File | undefined) => {
    if (!file) return;
    setUploading(folder);
    try {
      const url = await uploadSiteAsset(file, folder);
      const key = folder === "logo" ? "logo_url" : "hero_image_url";
      update(key, url);
      await save.mutateAsync({ [key]: url });
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const onSave = async () => {
    try {
      await save.mutateAsync(form);
      toast.success("Site updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Section title="Branding">
        <ImageField label="Logo" url={form.logo_url ?? null} uploading={uploading === "logo"}
          onFile={(f) => onFile("logo", f)}
          onClear={() => { update("logo_url", null); save.mutate({ logo_url: null }); }}
        />
        <ImageField label="Hero image" url={form.hero_image_url ?? null} uploading={uploading === "hero"}
          onFile={(f) => onFile("hero", f)}
          onClear={() => { update("hero_image_url", null); save.mutate({ hero_image_url: null }); }}
        />
        <TextField label="Site title" value={form.site_title ?? ""} onChange={(v) => update("site_title", v)} />
        <TextField label="Tagline" value={form.tagline ?? ""} onChange={(v) => update("tagline", v)} />
      </Section>

      <Section title="Home hero">
        <TextField label="Hero headline" value={form.hero_headline ?? ""} onChange={(v) => update("hero_headline", v)} />
        <TextArea label="Hero sub-headline" value={form.hero_subheadline ?? ""} onChange={(v) => update("hero_subheadline", v)} />
        <TextField label="Promo headline" value={form.promo_headline ?? ""} onChange={(v) => update("promo_headline", v)} />
        <TextField label="Promo body" value={form.promo_body ?? ""} onChange={(v) => update("promo_body", v)} />
        <TextField label="Promo code" value={form.promo_code ?? ""} onChange={(v) => update("promo_code", v)} />
      </Section>

      <Section title="Support">
        <TextField label="Support email" value={form.support_email ?? ""} onChange={(v) => update("support_email", v)} />
        <TextField label="Support WhatsApp / phone" value={form.support_whatsapp ?? ""} onChange={(v) => update("support_whatsapp", v)} />
        <TextArea label="Support body" value={form.support_body ?? ""} onChange={(v) => update("support_body", v)} />
      </Section>

      <Section title="Footer">
        <TextField label="Footer tagline" value={form.footer_tagline ?? ""} onChange={(v) => update("footer_tagline", v)} />
        <TextArea label="About text" value={form.footer_about ?? ""} onChange={(v) => update("footer_about", v)} />
        <TextField label="Copyright line" value={form.footer_copyright ?? ""} onChange={(v) => update("footer_copyright", v)} />
      </Section>

      <Section title="Legal links (footer)">
        <TextField label="Copyright & Terms URL" placeholder="https://…" value={form.legal_terms_url ?? ""} onChange={(v) => update("legal_terms_url", v || null)} />
        <TextField label="DMCA Policy URL" placeholder="https://…" value={form.legal_dmca_url ?? ""} onChange={(v) => update("legal_dmca_url", v || null)} />
        <TextField label="Privacy Policy URL" placeholder="https://…" value={form.legal_privacy_url ?? ""} onChange={(v) => update("legal_privacy_url", v || null)} />
        <p className="text-xs text-muted-foreground">Leave blank to keep the label greyed-out (non-clickable).</p>
      </Section>


      <div className="md:col-span-2 flex justify-end">
        <button
          onClick={onSave}
          disabled={save.isPending}
          className="inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-6 py-3 font-semibold btn-glow active:scale-95 transition disabled:opacity-60"
        >
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save all changes
        </button>
      </div>
    </div>
  );
}

/* ================== MATERIALS ================== */

function MaterialsTab() {
  const { data: materials = [], isLoading } = useMaterials();
  const save = useSaveMaterial();
  const del = useDeleteMaterial();
  const [editing, setEditing] = useState<Partial<Material> | null>(null);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{materials.length} materials</div>
        <button
          onClick={() => setEditing({ tier: "CORE", subject: "PCM MIX", type: "Books", title: "", description: "", link: "", sort_order: 1000 })}
          className="inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-4 py-2 text-sm font-semibold btn-glow active:scale-95 transition"
        >
          <Plus className="h-4 w-4" /> Add material
        </button>
      </div>

      <div className="rounded-2xl border border-border glass overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-widest">
            <tr>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3 hidden md:table-cell">Type</th>
              <th className="text-left p-3 hidden md:table-cell">Subject</th>
              <th className="text-left p-3 hidden lg:table-cell">Link</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => (
              <tr key={m.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-3">
                  <div className="font-semibold">{m.title}</div>
                  <div className="text-xs text-muted-foreground">{m.tier}</div>
                </td>
                <td className="p-3 hidden md:table-cell">{m.type}</td>
                <td className="p-3 hidden md:table-cell">{m.subject}</td>
                <td className="p-3 hidden lg:table-cell max-w-[200px] truncate">
                  {m.link ? (
                    <a href={m.link} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                      link <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground italic">—</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setEditing(m)} className="rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition">
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete "${m.title}"?`)) return;
                        try { await del.mutateAsync(m.id); toast.success("Deleted"); }
                        catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
                      }}
                      className="rounded-lg px-2 py-1.5 text-xs hover:bg-destructive/10 hover:text-destructive transition"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Edit material" : "New material"}>
          <div className="grid gap-3">
            <TextField label="Title" value={editing.title ?? ""} onChange={(v) => setEditing({ ...editing, title: v })} />
            <TextArea label="Description" value={editing.description ?? ""} onChange={(v) => setEditing({ ...editing, description: v })} />
            <TextField label="Link (URL)" value={editing.link ?? ""} onChange={(v) => setEditing({ ...editing, link: v })} placeholder="https://..." />
            <div className="grid grid-cols-3 gap-2">
              <SelectField label="Tier" value={editing.tier ?? "CORE"} options={[...TIERS]} onChange={(v) => setEditing({ ...editing, tier: v })} />
              <TextField label="Subject" value={editing.subject ?? "PCM MIX"} onChange={(v) => setEditing({ ...editing, subject: v })} />
              <SelectField label="Type" value={editing.type ?? "Books"} options={[...RESOURCE_TYPES]} onChange={(v) => setEditing({ ...editing, type: v })} />
            </div>
            <TextField label="Sort order (smaller = higher)" value={String(editing.sort_order ?? 1000)} onChange={(v) => setEditing({ ...editing, sort_order: Number(v) || 0 })} />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Cancel</button>
            <button
              onClick={async () => {
                try {
                  await save.mutateAsync(editing);
                  toast.success("Saved");
                  setEditing(null);
                } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
              }}
              disabled={save.isPending}
              className="inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-5 py-2 text-sm font-semibold btn-glow disabled:opacity-60"
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ================== PORTALS ================== */

function PortalsTab() {
  const { data: portals = [], isLoading } = usePortals();
  const save = useSavePortal();
  const del = useDeletePortal();
  const [editing, setEditing] = useState<Partial<Portal> | null>(null);
  const [uploading, setUploading] = useState(false);

  if (isLoading) return <Loading />;

  const onLogoFile = async (file: File | undefined) => {
    if (!file || !editing) return;
    setUploading(true);
    try {
      const url = await uploadSiteAsset(file, "misc");
      setEditing({ ...editing, logo_url: url });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{portals.length} portals</div>
        <button
          onClick={() => setEditing({ name: "", description: "", link: "", link_count: 0, sort_order: 1000 })}
          className="inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-4 py-2 text-sm font-semibold btn-glow active:scale-95 transition"
        >
          <Plus className="h-4 w-4" /> Add portal
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {portals.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border glass p-4 flex items-start gap-3">
            {p.logo_url ? (
              <img src={p.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover border border-border" />
            ) : (
              <div className="h-12 w-12 rounded-xl border border-dashed border-border/60 grid place-items-center text-[9px] text-muted-foreground">
                logo
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-bold truncate">{p.name}</div>
              <div className="text-xs text-muted-foreground truncate">{p.description}</div>
              <div className="mt-1 text-xs">
                {p.link ? (
                  <a href={p.link} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {p.link}
                  </a>
                ) : (
                  <span className="text-muted-foreground italic">no link yet</span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => setEditing(p)} className="rounded-lg px-3 py-1 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition">Edit</button>
              <button
                onClick={async () => {
                  if (!confirm(`Delete "${p.name}"?`)) return;
                  try { await del.mutateAsync(p.id); toast.success("Deleted"); }
                  catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
                }}
                className="rounded-lg px-3 py-1 text-xs hover:bg-destructive/10 hover:text-destructive transition inline-flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Edit portal" : "New portal"}>
          <div className="grid gap-3">
            <TextField label="Name" value={editing.name ?? ""} onChange={(v) => setEditing({ ...editing, name: v })} />
            <TextArea label="Description" value={editing.description ?? ""} onChange={(v) => setEditing({ ...editing, description: v })} />
            <TextField label="Link (URL)" value={editing.link ?? ""} onChange={(v) => setEditing({ ...editing, link: v })} placeholder="https://..." />
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Link count (badge)" value={String(editing.link_count ?? 0)} onChange={(v) => setEditing({ ...editing, link_count: Number(v) || 0 })} />
              <TextField label="Sort order" value={String(editing.sort_order ?? 1000)} onChange={(v) => setEditing({ ...editing, sort_order: Number(v) || 0 })} />
            </div>
            <ImageField label="Logo" url={editing.logo_url ?? null} uploading={uploading}
              onFile={onLogoFile}
              onClear={() => setEditing({ ...editing, logo_url: null })}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Cancel</button>
            <button
              onClick={async () => {
                try {
                  await save.mutateAsync(editing);
                  toast.success("Saved");
                  setEditing(null);
                } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
              }}
              disabled={save.isPending}
              className="inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-5 py-2 text-sm font-semibold btn-glow disabled:opacity-60"
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ================== ACCOUNT ================== */

function AccountTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Section title="Change password">
        <TextField label="New password (min 8 chars)" value={pw} onChange={setPw} type="password" />
        <button
          disabled={busy || pw.length < 8}
          onClick={async () => {
            setBusy(true);
            try {
              const { error } = await supabase.auth.updateUser({ password: pw });
              if (error) throw error;
              toast.success("Password updated");
              setPw("");
            } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
            finally { setBusy(false); }
          }}
          className="mt-2 inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-5 py-2 font-semibold btn-glow disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Update password
        </button>
      </Section>

      <Section title="Session">
        <div className="text-sm text-muted-foreground">
          Signed in as <span className="text-foreground font-semibold">{user?.email}</span>
        </div>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth" });
          }}
          className="mt-2 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 font-semibold hover:bg-muted active:scale-95 transition"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </Section>
    </div>
  );
}

/* ================== NAVIGATION ================== */

function NavigationTab() {
  const { data: items = [], isLoading } = useNavItems();
  const save = useSaveNavItem();
  const del = useDeleteNavItem();
  const [editing, setEditing] = useState<Partial<NavItem> | null>(null);

  if (isLoading) return <Loading />;

  const move = async (item: NavItem, dir: -1 | 1) => {
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
    const i = sorted.findIndex((n) => n.id === item.id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const other = sorted[j];
    try {
      await save.mutateAsync({ id: item.id, sort_order: other.sort_order });
      await save.mutateAsync({ id: other.id, sort_order: item.sort_order });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Reorder failed"); }
  };

  const toggle = async (item: NavItem) => {
    try {
      await save.mutateAsync({ id: item.id, enabled: !item.enabled });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {items.length} nav sections · shown top nav (desktop) & bottom bar (mobile, first 6)
        </div>
        <button
          onClick={() => setEditing({
            label: "", href: "/", icon: "Sparkles",
            sort_order: (items.at(-1)?.sort_order ?? 0) + 10,
            enabled: true, external: false,
          })}
          className="inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-4 py-2 text-sm font-semibold btn-glow active:scale-95 transition"
        >
          <Plus className="h-4 w-4" /> Add section
        </button>
      </div>

      <ul className="grid gap-2">
        {items.map((item) => {
          const Icon = getNavIcon(item.icon);
          return (
            <li key={item.id} className="flex items-center gap-3 rounded-2xl border border-border glass p-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl gradient-primary text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate flex items-center gap-2">
                  {item.label}
                  {!item.enabled && <span className="text-[10px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground">HIDDEN</span>}
                  {item.external && <span className="text-[10px] rounded-full bg-primary/10 px-2 py-0.5 text-primary">EXTERNAL</span>}
                </div>
                <div className="text-xs text-muted-foreground truncate">{item.href}</div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => move(item, -1)} title="Move up" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted"><ArrowUp className="h-4 w-4" /></button>
                <button onClick={() => move(item, 1)} title="Move down" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted"><ArrowDown className="h-4 w-4" /></button>
                <button onClick={() => toggle(item)} title={item.enabled ? "Hide" : "Show"} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted">
                  {item.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button onClick={() => setEditing(item)} className="rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition">Edit</button>
                <button
                  onClick={async () => {
                    if (!confirm(`Delete nav section "${item.label}"?`)) return;
                    try { await del.mutateAsync(item.id); toast.success("Deleted"); }
                    catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
                  }}
                  className="grid h-8 w-8 place-items-center rounded-lg hover:bg-destructive/10 hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Edit nav section" : "New nav section"}>
          <div className="grid gap-3">
            <TextField label="Label" value={editing.label ?? ""} onChange={(v) => setEditing({ ...editing, label: v })} />
            <TextField
              label={editing.external ? "URL (external)" : "Path (internal, e.g. /materials)"}
              value={editing.href ?? ""}
              onChange={(v) => setEditing({ ...editing, href: v })}
              placeholder={editing.external ? "https://…" : "/materials"}
            />
            <div className="grid grid-cols-2 gap-2">
              <SelectField label="Icon" value={editing.icon ?? "Sparkles"} options={NAV_ICON_NAMES} onChange={(v) => setEditing({ ...editing, icon: v })} />
              <TextField label="Sort order" value={String(editing.sort_order ?? 100)} onChange={(v) => setEditing({ ...editing, sort_order: Number(v) || 0 })} />
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={!!editing.enabled} onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })} /> Visible
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={!!editing.external} onChange={(e) => setEditing({ ...editing, external: e.target.checked })} /> External link (opens in new tab)
              </label>
            </div>
            <div className="rounded-xl border border-border p-3 text-xs text-muted-foreground">
              Preview: <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                {(() => { const I = getNavIcon(editing.icon); return <I className="h-4 w-4" />; })()}
                {editing.label || "Label"}
              </span>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Cancel</button>
            <button
              onClick={async () => {
                try { await save.mutateAsync(editing); toast.success("Saved"); setEditing(null); }
                catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
              }}
              disabled={save.isPending}
              className="inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-5 py-2 text-sm font-semibold btn-glow disabled:opacity-60"
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}



/* ================== Shared bits ================== */

function Loading() {
  return (
    <div className="flex justify-center py-12 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border glass p-5">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
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

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="text-xs tracking-widest text-muted-foreground">{label.toUpperCase()}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary transition"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
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
            <button onClick={onClear} className="text-xs text-muted-foreground hover:text-destructive text-left transition">
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl border border-border glass-strong p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-full h-8 w-8 grid place-items-center hover:bg-muted">×</button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
