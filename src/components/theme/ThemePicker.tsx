import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Monitor, Moon, MoreVertical, Sun, X } from "lucide-react";
import { THEMES, useTheme, type Appearance, type ThemeId } from "@/lib/theme";

const APPEARANCE: { id: Appearance; label: string; Icon: typeof Sun }[] = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System", Icon: Monitor },
];

/**
 * Compact ⋮ menu with appearance + theme pills.
 * Renders as a positioned popover that always stays inside the viewport.
 */
export function ThemePicker() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { theme, appearance, setTheme, setAppearance } = useTheme();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full glass hover:bg-muted/60 active:scale-95 transition"
        aria-label="Appearance and theme"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                key="theme-menu"
                ref={panelRef}
                role="dialog"
                aria-labelledby={titleId}
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="theme-menu glass-strong"
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div id={titleId} className="text-sm font-semibold">
                    Appearance
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted transition"
                    aria-label="Close"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div
                  className="grid grid-cols-3 gap-1 rounded-xl border border-border p-1"
                  role="radiogroup"
                  aria-label="Color mode"
                >
                  {APPEARANCE.map(({ id, label, Icon }) => {
                    const active = appearance === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setAppearance(id)}
                        className={`flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1.5 text-[11px] font-semibold transition ${
                          active
                            ? "gradient-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 mb-2 text-xs font-semibold text-muted-foreground">Theme</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {THEMES.map((t) => (
                    <ThemePill
                      key={t.id}
                      id={t.id}
                      name={t.name}
                      active={theme === t.id}
                      onClick={() => setTheme(t.id)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

function ThemePill({
  id,
  name,
  active,
  onClick,
}: {
  id: ThemeId;
  name: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 items-center gap-2 rounded-xl border px-2 py-2 text-left transition active:scale-[0.98] ${
        active
          ? "border-primary bg-primary/10 ring-1 ring-primary/40"
          : "border-border hover:border-primary/50"
      }`}
    >
      <span
        aria-hidden
        data-theme={id}
        className="h-3.5 w-3.5 shrink-0 rounded-full gradient-primary ring-1 ring-black/10"
      />
      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-tight">{name}</span>
      {active && <Check className="h-3 w-3 shrink-0 text-primary" />}
    </button>
  );
}
