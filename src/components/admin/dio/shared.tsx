import type { ReactNode } from "react";
import { Loader2, Image as ImageIcon } from "lucide-react";

/* Shared styling primitives for the Dio admin panels.
   Mirrors the look & feel of the main admin route (rounded glass cards,
   tracking-widest labels, gradient-primary CTAs) plus the Dio gold accent. */

export const DIO_GOLD = "#e8b23a";

export function Panel({
  title,
  kicker,
  actions,
  children,
}: {
  title: string;
  kicker?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border glass p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          {kicker && <div className="text-[10px] tracking-widest text-[#e8b23a]">{kicker}</div>}
          <h2 className="text-lg font-bold">{title}</h2>
        </div>
        {actions}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
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

export function Area({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs tracking-widest text-muted-foreground">{label.toUpperCase()}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="mt-1.5 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary transition resize-y"
      />
    </label>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-xs tracking-widest text-muted-foreground">{label.toUpperCase()}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary transition"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"} rounded-3xl border border-border glass-strong p-6 max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full h-8 w-8 grid place-items-center hover:bg-muted"
          >
            ×
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex justify-center py-12 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

export const primaryBtn =
  "inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-5 py-2 text-sm font-semibold btn-glow active:scale-95 transition disabled:opacity-60";

export const ghostBtn =
  "inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted active:scale-95 transition";

export const dangerBtn =
  "inline-flex items-center gap-2 rounded-full border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 active:scale-95 transition";

/** Small gold balance chip used across Dio admin panels. */
export function GoldAmount({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-bold tabular-nums ${className}`}>
      <span aria-hidden className="text-[#e8b23a]">
        ✦
      </span>
      {n.toLocaleString()}
    </span>
  );
}

/** Signed transaction amount with gold credits / muted debits. */
export function SignedAmount({ n }: { n: number }) {
  if (n > 0) {
    return (
      <span className="inline-flex items-center gap-1 font-bold tabular-nums text-[#e8b23a]">
        ✦ +{n.toLocaleString()}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 font-bold tabular-nums text-muted-foreground">
      ✦ −{Math.abs(n).toLocaleString()}
    </span>
  );
}

export function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Convert an ISO string to a value usable in <input type="datetime-local">. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert a datetime-local input value back to ISO (or null when empty). */
export function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
