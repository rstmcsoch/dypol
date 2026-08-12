import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ThemeContext,
  isAppearance,
  isThemeId,
  resolveMode,
  APPEARANCE_KEY,
  MODE_KEY,
  THEME_KEY,
  type Appearance,
  type Mode,
  type ThemeId,
} from "@/lib/theme";

function applyTheme(theme: ThemeId, mode: Mode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
}

function readStoredTheme(): ThemeId {
  if (typeof window === "undefined") return "sunset";
  const t = localStorage.getItem(THEME_KEY);
  return isThemeId(t) ? t : "sunset";
}

function readStoredAppearance(): Appearance {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(APPEARANCE_KEY);
  if (isAppearance(stored)) return stored;
  // Migrate a previously explicit light/dark choice. Never treat a missing
  // value as dark — system preference is the default.
  const legacy = localStorage.getItem(MODE_KEY);
  if (legacy === "light" || legacy === "dark") return legacy;
  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("sunset");
  const [appearance, setAppearanceState] = useState<Appearance>("system");
  const [mode, setModeState] = useState<Mode>("light");
  const themeRef = useRef(theme);
  const appearanceRef = useRef(appearance);
  themeRef.current = theme;
  appearanceRef.current = appearance;

  useEffect(() => {
    const t = readStoredTheme();
    const a = readStoredAppearance();
    const m = resolveMode(a);
    setThemeState(t);
    setAppearanceState(a);
    setModeState(m);
    applyTheme(t, m);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (appearanceRef.current !== "system") return;
      const m = resolveMode("system", mq.matches);
      setModeState(m);
      applyTheme(themeRef.current, m);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = (t: ThemeId) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
    applyTheme(t, mode);
  };

  const setAppearance = (a: Appearance) => {
    setAppearanceState(a);
    localStorage.setItem(APPEARANCE_KEY, a);
    // Keep the legacy key in sync only for explicit choices so older builds
    // don't suddenly force dark after a downgrade.
    if (a === "light" || a === "dark") localStorage.setItem(MODE_KEY, a);
    else localStorage.removeItem(MODE_KEY);
    const m = resolveMode(a);
    setModeState(m);
    applyTheme(theme, m);
  };

  const setMode = (m: Appearance | Mode) => setAppearance(m);
  const toggleMode = () => setAppearance(mode === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider
      value={{ theme, appearance, mode, setTheme, setAppearance, setMode, toggleMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
