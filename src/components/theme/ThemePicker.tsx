import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Palette, Sun, Moon, X } from "lucide-react";
import { THEMES, useTheme, type ThemeId } from "@/lib/theme";

export function ThemePicker() {
  const [open, setOpen] = useState(false);
  const { theme, mode, setTheme, toggleMode } = useTheme();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="grid h-10 w-10 place-items-center rounded-full glass hover:scale-105 active:scale-95 transition"
        aria-label="Themes"
      >
        <Palette className="h-4 w-4" />
      </button>
      <button
        onClick={toggleMode}
        className="grid h-10 w-10 place-items-center rounded-full glass hover:scale-105 active:scale-95 transition"
        aria-label="Toggle mode"
      >
        {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] grid place-items-center bg-black/60 backdrop-blur-md p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-3xl glass-strong p-6 md:p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Select Theme</h2>
                  <p className="text-sm text-muted-foreground mt-1">Personalize your vibe</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-full hover:bg-muted transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                {THEMES.map((t) => (
                  <ThemeCard
                    key={t.id}
                    id={t.id}
                    name={t.name}
                    desc={t.desc}
                    active={theme === t.id}
                    onClick={() => setTheme(t.id)}
                  />
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between rounded-2xl border border-border p-4">
                <div>
                  <div className="font-semibold">Appearance</div>
                  <div className="text-xs text-muted-foreground">Light / Dark mode</div>
                </div>
                <button
                  onClick={toggleMode}
                  className="flex items-center gap-2 rounded-full px-4 py-2 gradient-primary text-primary-foreground font-medium btn-glow hover:[&]:opacity-95 active:scale-95 transition"
                >
                  {mode === "dark" ? (
                    <>
                      <Sun className="h-4 w-4" /> Light
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4" /> Dark
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ThemeCard({
  id,
  name,
  desc,
  active,
  onClick,
}: {
  id: ThemeId;
  name: string;
  desc: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
        active ? "border-primary ring-2 ring-primary/50" : "border-border hover:border-primary/50"
      }`}
    >
      <div
        aria-hidden
        data-theme={id}
        className="absolute inset-0 -z-10 opacity-30 group-hover:opacity-50 transition-opacity gradient-primary"
      />
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
        </div>
        {active && (
          <div className="grid h-6 w-6 place-items-center rounded-full gradient-primary text-primary-foreground">
            <Check className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <div className="mt-3 flex gap-1.5" data-theme={id}>
        <span className="h-3 flex-1 rounded-full gradient-primary" />
        <span className="h-3 w-3 rounded-full bg-primary" />
        <span className="h-3 w-3 rounded-full bg-accent" />
      </div>
    </button>
  );
}
