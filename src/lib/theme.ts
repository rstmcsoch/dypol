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
export type Mode = "light" | "dark";

export interface ThemeCtx {
  theme: ThemeId;
  mode: Mode;
  setTheme: (t: ThemeId) => void;
  setMode: (m: Mode) => void;
  toggleMode: () => void;
}

export const ThemeContext = createContext<ThemeCtx | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
