import { Loader2, X } from "lucide-react";

export function Loading() {
  return (
    <div className="grid place-items-center py-16 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

export function Section({
  title,
  hint,
  children,
  right,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border glass p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {right}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

export function TextField({
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

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs tracking-widest text-muted-foreground">{label.toUpperCase()}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="mt-1.5 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary transition resize-y"
      />
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly T[] | { value: T; label: string }[];
  hint?: string;
}) {
  const normalized = (options as readonly (T | { value: T; label: string })[]).map((o) =>
    typeof o === "string" ? { value: o as T, label: o as string } : o,
  );
  return (
    <label className="block">
      <span className="text-xs tracking-widest text-muted-foreground">{label.toUpperCase()}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary transition"
      >
        {normalized.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function Toggle({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted transition text-left"
    >
      <span>
        <span className="block">{label}</span>
        {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
      </span>
      <span
        className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition ${value ? "gradient-primary" : "bg-muted"}`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-background transition-transform ${value ? "translate-x-4" : ""}`}
        />
      </span>
    </button>
  );
}

export function NumField({
  label,
  value,
  onChange,
  min,
  max,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs tracking-widest text-muted-foreground">{label.toUpperCase()}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        onChange={(e) => {
          let v = Number(e.target.value);
          if (!Number.isFinite(v)) v = 0;
          if (min !== undefined) v = Math.max(min, v);
          if (max !== undefined) v = Math.min(max, v);
          onChange(v);
        }}
        className="mt-1.5 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary transition"
      />
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function SaveBar({
  pending,
  onCancel,
  onSave,
  saveLabel = "Save",
}: {
  pending: boolean;
  onCancel?: () => void;
  onSave: () => void;
  saveLabel?: string;
}) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      {onCancel && (
        <button
          onClick={onCancel}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          Cancel
        </button>
      )}
      <button
        onClick={onSave}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-5 py-2 text-sm font-semibold btn-glow disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} {saveLabel}
      </button>
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
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
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-4 py-2 text-sm font-semibold btn-glow active:scale-95 transition disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold hover:bg-muted active:scale-95 transition disabled:opacity-50"
    >
      {children}
    </button>
  );
}
