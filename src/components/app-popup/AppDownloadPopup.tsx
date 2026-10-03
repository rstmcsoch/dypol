import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface PopupContent {
  apk_url: string;
  version: string;
  file_size_label: string;
  title: string;
  description: string;
  whats_new: string;
  download_label: string;
  dismiss_label: string;
  note_text: string;
  image_url: string | null;
}

const DONE_KEY = "dypol.apppopup.done";

/** Presentational sheet, shared with the admin preview. */
export function AppDownloadSheet({
  content,
  open,
  onDownload,
  onDismiss,
}: {
  content: PopupContent;
  open: boolean;
  onDownload: () => void;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-background/30 backdrop-blur-md" onClick={onDismiss} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={content.title}
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="absolute left-3 right-3 mx-auto max-w-lg md:left-auto md:right-6 md:mx-0 rounded-3xl border border-border glass shadow-2xl p-5"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
          >
            <button
              onClick={onDismiss}
              aria-label="Close"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex gap-4 pr-6">
              {content.image_url ? (
                <img src={content.image_url} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover border border-border" />
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-2xl border-2 border-dashed border-border/70 grid place-items-center text-muted-foreground">
                  <Smartphone className="h-6 w-6" />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold leading-tight">{content.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{content.description}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {content.version && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-primary font-semibold">
                      Version {content.version.replace(/^v/i, "")}
                    </span>
                  )}
                  {content.file_size_label && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">{content.file_size_label}</span>
                  )}
                </div>
              </div>
            </div>
            {content.whats_new && (
              <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-3 text-xs">
                <div className="font-semibold tracking-widest text-muted-foreground">WHAT'S NEW</div>
                <p className="mt-1 whitespace-pre-line">{content.whats_new}</p>
              </div>
            )}
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row">
              <button
                onClick={onDismiss}
                className="flex-1 rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted active:scale-95 focus-visible:ring-2 focus-visible:ring-ring outline-none transition"
              >
                {content.dismiss_label || "Maybe later"}
              </button>
              <button
                onClick={onDownload}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full gradient-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold btn-glow hover:-translate-y-0.5 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring outline-none transition"
              >
                <Download className="h-4 w-4" /> {content.download_label || "Download APK"}
              </button>
            </div>
            {content.note_text && <p className="mt-3 text-center text-[11px] text-muted-foreground">{content.note_text}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Eligibility-gated popup. Backend (app_popup_check) is the source of truth. */
export function AppDownloadPopup() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [content, setContent] = useState<PopupContent | null>(null);
  const [open, setOpen] = useState(false);
  const onHome = pathname === "/";

  useEffect(() => {
    if (!user || !onHome) { setOpen(false); return; }
    if (localStorage.getItem(DONE_KEY) === user.id) return;
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc("app_popup_check");
        const r = data as unknown as { show: boolean; settings?: PopupContent } | null;
        if (!alive || error || !r?.show || !r.settings) return;
        setContent(r.settings);
        setOpen(true);
        void supabase.rpc("app_popup_mark", { _action: "seen" });
      } catch {
        /* fail safe: no popup */
      }
    }, 1200);
    return () => { alive = false; clearTimeout(t); };
  }, [user?.id, onHome]);

  const finish = (action: "dismissed" | "downloaded") => {
    setOpen(false);
    if (user) localStorage.setItem(DONE_KEY, user.id);
    void supabase.rpc("app_popup_mark", { _action: action });
  };

  if (!content) return null;
  return (
    <AppDownloadSheet
      content={content}
      open={open && onHome}
      onDismiss={() => finish("dismissed")}
      onDownload={() => {
        finish("downloaded");
        window.open(content.apk_url, "_blank", "noopener,noreferrer");
      }}
    />
  );
}
