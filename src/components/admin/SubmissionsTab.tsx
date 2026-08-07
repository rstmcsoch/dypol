import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Check, X, Pencil, Trash2, Eye, RotateCcw, Users, Save, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { RESOURCE_TYPES, SUBJECTS } from "@/lib/data";
import {
  useAllSubmissions, useAdminUpdateSubmission, useApproveSubmission,
  useRejectSubmission, useSoftDeleteSubmission, useHardDeleteSubmission,
  type CommunitySubmission, type SubmissionKind, type SubmissionStatus,
} from "@/lib/community";

const FILTERS: Array<{ k: "all" | SubmissionStatus | "deleted"; label: string }> = [
  { k: "pending", label: "Pending" },
  { k: "approved", label: "Approved" },
  { k: "rejected", label: "Rejected" },
  { k: "deleted", label: "Deleted" },
  { k: "all", label: "All" },
];

function statusClass(s: SubmissionStatus) {
  if (s === "approved") return "bg-primary/15 text-primary";
  if (s === "rejected") return "bg-destructive/15 text-destructive";
  return "bg-muted text-foreground";
}

export function SubmissionsTab() {
  const { data: rows = [], isLoading } = useAllSubmissions();
  const [filter, setFilter] = useState<"all" | SubmissionStatus | "deleted">("pending");
  const [editing, setEditing] = useState<CommunitySubmission | null>(null);
  const [viewing, setViewing] = useState<CommunitySubmission | null>(null);
  const [form, setForm] = useState({
    material_name: "", description: "", link: "", credit_name: "", kind: "material" as SubmissionKind,
  });
  const [subject, setSubject] = useState<string>("PCM Mix");
  const [type, setType] = useState<string>("Notes");

  const update = useAdminUpdateSubmission();
  const approve = useApproveSubmission();
  const reject = useRejectSubmission();
  const softDelete = useSoftDeleteSubmission();
  const hardDelete = useHardDeleteSubmission();

  const list = useMemo(() => {
    return rows.filter((r) => {
      if (filter === "deleted") return !!r.deleted_at;
      if (r.deleted_at) return false;
      if (filter === "all") return true;
      return r.status === filter;
    });
  }, [rows, filter]);

  const openEdit = (s: CommunitySubmission) => {
    setEditing(s);
    setForm({
      material_name: s.material_name,
      description: s.description,
      link: s.link,
      credit_name: s.credit_name,
      kind: s.kind,
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    update.mutate(
      { id: editing.id, user_id: editing.user_id, ...form },
      {
        onSuccess: () => {
          toast.success("Submission updated");
          setEditing(null);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
      },
    );
  };

  const doApprove = (s: CommunitySubmission) => {
    approve.mutate(
      { submission: s, subject, type },
      {
        onSuccess: () => toast.success("Approved — it's live and searchable now"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Approve failed"),
      },
    );
  };

  const doReject = (s: CommunitySubmission) => {
    const note = window.prompt("Rejection reason (optional)") ?? "";
    reject.mutate(
      { submission: s, note },
      {
        onSuccess: () => toast.success("Submission rejected"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Reject failed"),
      },
    );
  };

  return (
    <div className="rounded-3xl border border-border glass p-5 md:p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs tracking-widest text-primary">✦ COMMUNITY</div>
          <h2 className="mt-1 text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Community Submissions
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review user-contributed materials and portals. Approved items go live with contributor credit.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-2xl border border-border p-1">
          {FILTERS.map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                filter === f.k ? "gradient-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Approval defaults for materials */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[10px] tracking-widest text-muted-foreground">APPROVE AS SUBJECT</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
          >
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] tracking-widest text-muted-foreground">APPROVE AS TYPE</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
          >
            {RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-10 flex justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nothing here.
        </p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-5 hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[10px] tracking-widest text-muted-foreground">
                <tr>
                  <th className="p-2">ID</th>
                  <th className="p-2">NAME</th>
                  <th className="p-2">DESCRIPTION</th>
                  <th className="p-2">LINK</th>
                  <th className="p-2">CREDIT</th>
                  <th className="p-2">USER</th>
                  <th className="p-2">DATE</th>
                  <th className="p-2">STATUS</th>
                  <th className="p-2 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="border-t border-border align-top">
                    <td className="p-2 font-mono text-[10px] text-muted-foreground">{s.id.slice(0, 8)}</td>
                    <td className="p-2 font-semibold max-w-[180px]">{s.material_name}</td>
                    <td className="p-2 max-w-[240px] text-muted-foreground line-clamp-3">{s.description}</td>
                    <td className="p-2 max-w-[140px]">
                      {s.link ? (
                        <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                          open <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-2">{s.credit_name}</td>
                    <td className="p-2 text-xs text-muted-foreground break-all max-w-[150px]">{s.user_email || s.user_id.slice(0, 8)}</td>
                    <td className="p-2 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="p-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass(s.status)}`}>{s.status}</span>
                    </td>
                    <td className="p-2">
                      <Actions
                        s={s}
                        onView={() => setViewing(s)}
                        onEdit={() => openEdit(s)}
                        onApprove={() => doApprove(s)}
                        onReject={() => doReject(s)}
                        onSoftDelete={() => softDelete.mutate({ id: s.id })}
                        onRestore={() => softDelete.mutate({ id: s.id, restore: true })}
                        onHardDelete={() => hardDelete.mutate(s.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile / tablet cards */}
          <ul className="mt-5 grid gap-3 lg:hidden">
            {list.map((s) => (
              <li key={s.id} className="rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-semibold">{s.material_name}</div>
                    <div className="text-[11px] text-muted-foreground break-all">
                      {s.user_email || s.user_id.slice(0, 8)} · {new Date(s.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass(s.status)}`}>{s.status}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{s.description}</p>
                <div className="mt-1 text-xs text-muted-foreground">Credit: {s.credit_name}</div>
                <div className="mt-3">
                  <Actions
                    s={s}
                    onView={() => setViewing(s)}
                    onEdit={() => openEdit(s)}
                    onApprove={() => doApprove(s)}
                    onReject={() => doReject(s)}
                    onSoftDelete={() => softDelete.mutate({ id: s.id })}
                    onRestore={() => softDelete.mutate({ id: s.id, restore: true })}
                    onHardDelete={() => hardDelete.mutate(s.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* View details */}
      <AnimatePresence>
        {viewing && (
          <Modal onClose={() => setViewing(null)} title="Submission details">
            <dl className="grid gap-3 text-sm">
              <Row label="Submission ID" value={viewing.id} mono />
              <Row label="Name" value={viewing.material_name} />
              <Row label="Description" value={viewing.description} />
              <Row label="Link" value={viewing.link || "—"} />
              <Row label="Credit name" value={viewing.credit_name} />
              <Row label="Kind" value={viewing.kind} />
              <Row label="User" value={viewing.user_email || viewing.user_id} />
              <Row label="Submitted" value={new Date(viewing.created_at).toLocaleString()} />
              <Row label="Status" value={viewing.status} />
              {viewing.admin_notes && <Row label="Admin note" value={viewing.admin_notes} />}
              <Row label="Edited by admin" value={viewing.edited_by_admin ? "Yes" : "No"} />
            </dl>
          </Modal>
        )}
      </AnimatePresence>

      {/* Edit before approval */}
      <AnimatePresence>
        {editing && (
          <Modal onClose={() => setEditing(null)} title="Edit before approval">
            <div className="grid gap-4">
              <Field label="MATERIAL / PORTAL NAME">
                <input
                  value={form.material_name}
                  onChange={(e) => setForm((f) => ({ ...f, material_name: e.target.value }))}
                  maxLength={150}
                  className="w-full rounded-xl border border-border bg-transparent px-3 py-2 outline-none focus:border-primary"
                />
              </Field>
              <Field label="DESCRIPTION">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={5}
                  maxLength={2000}
                  className="w-full rounded-xl border border-border bg-transparent px-3 py-2 outline-none focus:border-primary resize-y"
                />
              </Field>
              <Field label="LINK">
                <input
                  value={form.link}
                  onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-transparent px-3 py-2 outline-none focus:border-primary"
                />
              </Field>
              <Field label="CREDIT NAME">
                <input
                  value={form.credit_name}
                  onChange={(e) => setForm((f) => ({ ...f, credit_name: e.target.value }))}
                  maxLength={40}
                  className="w-full rounded-xl border border-border bg-transparent px-3 py-2 outline-none focus:border-primary"
                />
              </Field>
              <Field label="PUBLISH AS">
                <div className="flex gap-2">
                  {(["material", "portal"] as SubmissionKind[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => setForm((f) => ({ ...f, kind: k }))}
                      className={`flex-1 rounded-xl border py-2 text-sm font-semibold capitalize transition active:scale-95 ${
                        form.kind === k ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </Field>
              <button
                onClick={saveEdit}
                disabled={update.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-full gradient-primary text-primary-foreground px-5 py-2.5 font-semibold btn-glow active:scale-95 transition disabled:opacity-60"
              >
                {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function Actions({
  s, onView, onEdit, onApprove, onReject, onSoftDelete, onRestore, onHardDelete,
}: {
  s: CommunitySubmission;
  onView: () => void;
  onEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onSoftDelete: () => void;
  onRestore: () => void;
  onHardDelete: () => void;
}) {
  const btn = "inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold hover:bg-muted active:scale-95 transition";
  return (
    <div className="flex flex-wrap gap-1.5 justify-end">
      <button onClick={onView} className={btn}><Eye className="h-3 w-3" /> View</button>
      {s.status === "pending" && !s.deleted_at && (
        <>
          <button onClick={onEdit} className={btn}><Pencil className="h-3 w-3" /> Edit</button>
          <button onClick={onApprove} className={`${btn} border-primary text-primary hover:bg-primary/10`}>
            <Check className="h-3 w-3" /> Approve
          </button>
          <button onClick={onReject} className={`${btn} border-destructive/50 text-destructive hover:bg-destructive/10`}>
            <X className="h-3 w-3" /> Reject
          </button>
        </>
      )}
      {s.deleted_at ? (
        <>
          <button onClick={onRestore} className={btn}><RotateCcw className="h-3 w-3" /> Restore</button>
          <button
            onClick={() => window.confirm("Delete permanently?") && onHardDelete()}
            className={`${btn} border-destructive/50 text-destructive hover:bg-destructive/10`}
          >
            <Trash2 className="h-3 w-3" /> Delete forever
          </button>
        </>
      ) : (
        <button onClick={onSoftDelete} className={`${btn} border-destructive/50 text-destructive hover:bg-destructive/10`}>
          <Trash2 className="h-3 w-3" /> Delete
        </button>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur px-4 py-8 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl border border-border glass-strong p-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted transition active:scale-90">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] tracking-widest text-muted-foreground">{label.toUpperCase()}</dt>
      <dd className={`mt-0.5 break-words ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] tracking-widest text-muted-foreground">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export default SubmissionsTab;
