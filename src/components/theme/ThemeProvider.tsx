import { useEffect, useState, type ReactNode } from "react";
import { ThemeContext, type ThemeId, type Mode } from "@/lib/theme";

const THEME_KEY = "dypol-theme";
const MODE_KEY = "dypol-mode";

function applyTheme(theme: ThemeId, mode: Mode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("sunset");
  const [mode, setModeState] = useState<Mode>("dark");

  useEffect(() => {
    const t = (localStorage.getItem(THEME_KEY) as ThemeId | null) ?? "sunset";
    const m = (localStorage.getItem(MODE_KEY) as Mode | null) ?? "dark";
    setThemeState(t);
    setModeState(m);
    applyTheme(t, m);
  }, []);

  const setTheme = (t: ThemeId) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
    applyTheme(t, mode);
  };
  const setMode = (m: Mode) => {
    setModeState(m);
    localStorage.setItem(MODE_KEY, m);
    applyTheme(theme, m);
  };
  const toggleMode = () => setMode(mode === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, mode, setTheme, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
