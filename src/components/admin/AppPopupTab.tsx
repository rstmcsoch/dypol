import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Eye, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadSiteAsset } from "@/lib/site-api";
import { AppDownloadSheet, type PopupContent } from "@/components/app-popup/AppDownloadPopup";

type Settings = PopupContent & { enabled: boolean };

const EMPTY: Settings = {
  enabled: false, apk_url: "", version: "1.0.0", file_size_label: "", title: "Get the Dypol App",
  description: "", whats_new: "", download_label: "Download APK", dismiss_label: "Maybe later",
  note_text: "", image_url: null,
};

function fmtSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

export function AppPopupTab() {
  const qc = useQueryClient();
  const [f, setF] = useState<Settings>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const settingsQ = useQuery({
    queryKey: ["admin", "app-popup"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_download_settings").select("*").eq("key", "default").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const statsQ = useQuery({
    queryKey: ["admin", "app-popup-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_app_popup_stats");
      if (error) throw error;
      return data as unknown as { eligible: number; shown: number; downloads: number; dismissals: number; conversion: number };
    },
  });

  useEffect(() => {
    if (settingsQ.data) setF({ ...EMPTY, ...settingsQ.data } as Settings);
  }, [settingsQ.data]);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (f.apk_url && !/^https:\/\/[^\s]+$/i.test(f.apk_url)) return toast.error("Download link must start with https://");
    if (f.enabled && !f.apk_url) return toast.error("Add a download link before enabling the popup");
    if (!f.title.trim()) return toast.error("Title is required");
    setSaving(true);
    const payload = {
      key: "default", enabled: f.enabled, apk_url: f.apk_url.trim(), version: f.version.trim().slice(0, 40),
      file_size_label: f.file_size_label.trim().slice(0, 40), title: f.title.trim().slice(0, 120),
      description: f.description.trim().slice(0, 400), whats_new: f.whats_new.trim().slice(0, 800),
      download_label: f.download_label.trim().slice(0, 40) || "Download APK",
      dismiss_label: f.dismiss_label.trim().slice(0, 40) || "Maybe later",
      note_text: f.note_text.trim().slice(0, 200), image_url: f.image_url,
    };
    const { error } = await supabase.from("app_download_settings").upsert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Popup settings saved");
    qc.invalidateQueries({ queryKey: ["admin", "app-popup"] });
  };

  const upload = async (file: File, kind: "apk" | "image") => {
    setBusy(kind);
    try {
      const url = await uploadSiteAsset(file, kind === "apk" ? "app-releases" : "misc");
      if (kind === "apk") { set("apk_url", url); set("file_size_label", fmtSize(file.size)); }
      else set("image_url", url);
      toast.success("Uploaded — remember to save");
    } catch (e) {
      toast.error((e as Error).message || "Upload failed");
    } finally { setBusy(null); }
  };

  const s = statsQ.data;
  const field = "w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ["Eligible users", s?.eligible], ["Popup shown", s?.shown], ["Downloads", s?.downloads],
          ["Dismissals", s?.dismissals], ["Conversion", s ? `${s.conversion}%` : undefined],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded-2xl border border-border glass p-4">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="mt-1 text-2xl font-bold">{v ?? "—"}</div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-border glass p-5 space-y-4">
        <label className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold">Show download popup</div>
            <div className="text-xs text-muted-foreground">Signed-in users with verified email who finished onboarding, once, on the homepage.</div>
          </div>
          <input type="checkbox" checked={f.enabled} onChange={(e) => set("enabled", e.target.checked)} className="h-5 w-5 accent-[var(--primary)]" />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <div className="text-xs font-semibold mb-1">APK download link (https)</div>
            <div className="flex gap-2">
              <input className={field} value={f.apk_url} onChange={(e) => set("apk_url", e.target.value)} placeholder="https://…/dypol.apk" />
              <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-muted transition">
                <Upload className="h-4 w-4" /> {busy === "apk" ? "Uploading…" : "Upload APK"}
                <input type="file" accept=".apk,application/vnd.android.package-archive" className="hidden" disabled={!!busy}
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file, "apk"); e.target.value = ""; }} />
              </label>
            </div>
          </div>
          {([
            ["version", "Version"], ["file_size_label", "File size label"], ["title", "Title"],
            ["download_label", "Download button text"], ["dismiss_label", "Later button text"], ["note_text", "Small note"],
          ] as const).map(([k, l]) => (
            <div key={k}>
              <div className="text-xs font-semibold mb-1">{l}</div>
              <input className={field} value={f[k]} onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
          <div className="md:col-span-2">
            <div className="text-xs font-semibold mb-1">Description</div>
            <textarea rows={2} className={field} value={f.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <div className="text-xs font-semibold mb-1">What's new (optional)</div>
            <textarea rows={3} className={field} value={f.whats_new} onChange={(e) => set("whats_new", e.target.value)} />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            {f.image_url ? <img src={f.image_url} alt="" className="h-14 w-14 rounded-2xl object-cover border border-border" />
              : <div className="h-14 w-14 rounded-2xl border-2 border-dashed border-border" />}
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted transition">
              <Upload className="h-4 w-4" /> {busy === "image" ? "Uploading…" : "App icon / image"}
              <input type="file" accept="image/*" className="hidden" disabled={!!busy}
                onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file, "image"); e.target.value = ""; }} />
            </label>
            {f.image_url && <button onClick={() => set("image_url", null)} className="text-sm text-muted-foreground hover:text-foreground">Remove</button>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold btn-glow active:scale-95 transition disabled:opacity-60">
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={() => setPreview(true)} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted active:scale-95 transition">
            <Eye className="h-4 w-4" /> Preview
          </button>
        </div>
      </div>

      <AppDownloadSheet content={f} open={preview} onDismiss={() => setPreview(false)}
        onDownload={() => { toast("Preview only — nothing recorded"); setPreview(false); }} />
    </div>
  );
}
