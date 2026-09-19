"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const themeListeners = new Set<() => void>();
let cachedTheme: Theme | undefined;

function getThemeSnapshot(): Theme {
  if (cachedTheme) return cachedTheme;
  if (typeof window === "undefined") return "light";
  try {
    const saved = window.localStorage.getItem("joc-theme") as Theme | null;
    cachedTheme = saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  } catch {
    cachedTheme = "light";
  }
  return cachedTheme;
}

function subscribeToTheme(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === "joc-theme") {
      cachedTheme = undefined;
      listener();
    }
  };
  themeListeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    themeListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function updateTheme(nextTheme: Theme) {
  cachedTheme = nextTheme;
  try {
    window.localStorage.setItem("joc-theme", nextTheme);
  } catch {}
  themeListeners.forEach((listener) => listener());
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => "light" as Theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, toggleTheme: () => updateTheme(theme === "light" ? "dark" : "light") }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
