import { createContext, useContext } from "react";

export const THEMES = [
  { id: "sunset", name: "Sunset Blaze", desc: "Warm orange to red gradient" },
  { id: "sandalwood", name: "Sandalwood", desc: "Warm & cozy wood tones" },
  { id: "forest", name: "Forest Emerald", desc: "Deep natural greens" },
  { id: "ocean", name: "Ocean Deep", desc: "Abyssal deep blues" },
  { id: "sakura", name: "Sakura Blossom", desc: "Soft pink floral hues" },
  { id: "dracula", name: "Dracula Midnight", desc: "Vampiric gothic purple" },
  { id: "lavender", name: "Lavender Mist", desc: "Gentle pastel violet" },
  { id: "cyberpunk", name: "Cyberpunk Neon", desc: "High contrast neon synth" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
/** User-facing appearance preference. "system" follows prefers-color-scheme. */
export type Appearance = "light" | "dark" | "system";
/** Resolved light/dark actually applied to the document. */
export type Mode = "light" | "dark";

export const THEME_KEY = "dypol-theme";
export const APPEARANCE_KEY = "dypol-appearance";
/** Legacy key from when only light/dark were stored. */
export const MODE_KEY = "dypol-mode";

export function isThemeId(v: string | null): v is ThemeId {
  return !!v && THEMES.some((t) => t.id === v);
}

export function isAppearance(v: string | null): v is Appearance {
  return v === "light" || v === "dark" || v === "system";
}

export function resolveMode(appearance: Appearance, prefersDark?: boolean): Mode {
  if (appearance === "light") return "light";
  if (appearance === "dark") return "dark";
  if (typeof prefersDark === "boolean") return prefersDark ? "dark" : "light";
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export interface ThemeCtx {
  theme: ThemeId;
  /** User preference: light, dark, or follow the device. */
  appearance: Appearance;
  /** Resolved light/dark currently applied. */
  mode: Mode;
  setTheme: (t: ThemeId) => void;
  setAppearance: (a: Appearance) => void;
  setMode: (m: Appearance | Mode) => void;
  toggleMode: () => void;
}

export const ThemeContext = createContext<ThemeCtx | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
