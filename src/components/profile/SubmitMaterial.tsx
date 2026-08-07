import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Send, Upload, Clock, CheckCircle2, XCircle, Bell } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateSubmission,
  useMySubmissions,
  useNotifications,
  useMarkNotificationsRead,
  validateSubmission,
  type SubmissionStatus,
} from "@/lib/community";

const EMPTY = { material_name: "", description: "", link: "", credit_name: "" };

function StatusPill({ status }: { status: SubmissionStatus }) {
  const map = {
    pending: { label: "Pending Review", cls: "bg-muted text-foreground", Icon: Clock },
    approved: { label: "Approved", cls: "bg-primary/15 text-primary", Icon: CheckCircle2 },
    rejected: { label: "Rejected", cls: "bg-destructive/15 text-destructive", Icon: XCircle },
  }[status];
  const Icon = map.Icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${map.cls}`}>
      <Icon className="h-3 w-3" /> {map.label}
    </span>
  );
}

export function SubmitMaterial({ userId, email }: { userId: string; email: string | undefined }) {
  const [form, setForm] = useState(EMPTY);
  const create = useCreateSubmission(userId, email);
  const { data: mine = [], isLoading } = useMySubmissions(userId);
  const { data: notes = [] } = useNotifications(userId);
  const markRead = useMarkNotificationsRead(userId);

  const unread = notes.filter((n) => !n.read).length;

  const submit = () => {
    const problem = validateSubmission(form);
    if (problem) {
      toast.error(problem);
      return;
    }
    create.mutate(form, {
      onSuccess: () => {
        toast.success("Your submission has been sent to the Dypol Admin Team for review.");
        setForm(EMPTY);
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Submission failed"),
    });
  };

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <section className="mt-8 rounded-3xl border border-border glass p-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs tracking-widest text-primary">✦ CONTRIBUTE</div>
          <h2 className="mt-1 text-2xl font-bold flex items-center gap-2">
            <Upload className="h-6 w-6 text-primary" /> Submit Study Material
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Share a material, portal or resource link. Nothing goes public until the Dypol team approves it.
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={() => markRead.mutate()}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary text-primary px-3 py-1.5 text-xs font-semibold hover:bg-primary/10 active:scale-95 transition"
          >
            <Bell className="h-3.5 w-3.5" /> {unread} new update{unread > 1 ? "s" : ""}
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="text-xs tracking-widest text-muted-foreground">MATERIAL / PORTAL NAME *</label>
          <input
            value={form.material_name}
            onChange={set("material_name")}
            maxLength={150}
            placeholder="e.g. HC Verma Solutions — Mechanics"
            className="mt-2 w-full rounded-2xl border border-border bg-transparent px-4 py-3 outline-none focus:border-primary transition"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs tracking-widest text-muted-foreground">DESCRIPTION *</label>
          <textarea
            value={form.description}
            onChange={set("description")}
            maxLength={2000}
            rows={4}
            placeholder="What is it, who is it for, why is it useful? (min 20 characters)"
            className="mt-2 w-full rounded-2xl border border-border bg-transparent px-4 py-3 outline-none focus:border-primary transition resize-y"
          />
          <div className="mt-1 text-right text-[10px] text-muted-foreground">{form.description.length}/2000</div>
        </div>
        <div>
          <label className="text-xs tracking-widest text-muted-foreground">URL / LINK (OPTIONAL)</label>
          <input
            value={form.link}
            onChange={set("link")}
            inputMode="url"
            placeholder="https://…"
            className="mt-2 w-full rounded-2xl border border-border bg-transparent px-4 py-3 outline-none focus:border-primary transition"
          />
        </div>
        <div>
          <label className="text-xs tracking-widest text-muted-foreground">CREDIT NAME *</label>
          <input
            value={form.credit_name}
            onChange={set("credit_name")}
            maxLength={40}
            placeholder="Shown publicly, e.g. Rustam"
            className="mt-2 w-full rounded-2xl border border-border bg-transparent px-4 py-3 outline-none focus:border-primary transition"
          />
        </div>
      </div>

      <button
        onClick={submit}
        disabled={create.isPending}
        className="mt-6 inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-5 py-2.5 font-semibold btn-glow active:scale-95 transition disabled:opacity-60"
      >
        {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit for review
      </button>

      {/* Previous submissions */}
      <div className="mt-8 border-t border-border pt-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Your submissions</h3>
          <span className="text-sm text-muted-foreground">{mine.length} total</span>
        </div>

        {isLoading ? (
          <div className="mt-6 flex justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : mine.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            You haven't submitted anything yet.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3">
            <AnimatePresence initial={false}>
              {mine.map((s) => (
                <motion.li
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-border p-4 hover:border-primary/50 transition"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{s.material_name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString()} · credit: {s.credit_name}
                        {s.edited_by_admin ? " · edited by admin" : ""}
                      </div>
                    </div>
                    <StatusPill status={s.status} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{s.description}</p>
                  {s.link && (
                    <a
                      href={s.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-primary hover:underline break-all"
                    >
                      {s.link}
                    </a>
                  )}
                  {s.status === "rejected" && s.admin_notes && (
                    <div className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      Reason: {s.admin_notes}
                    </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {notes.length > 0 && (
        <div className="mt-8 border-t border-border pt-6">
          <h3 className="font-bold flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Notifications
          </h3>
          <ul className="mt-3 grid gap-2">
            {notes.slice(0, 8).map((n) => (
              <li
                key={n.id}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  n.read ? "border-border text-muted-foreground" : "border-primary/40 bg-primary/5"
                }`}
              >
                <span className="font-semibold">{n.title}</span>
                {n.body && <span className="block text-xs text-muted-foreground">{n.body}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default SubmitMaterial;
