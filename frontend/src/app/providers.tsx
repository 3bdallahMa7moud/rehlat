"use client";

import { DemoProvider } from "@/state/DemoContext";
import { ThemeProvider } from "@/state/ThemeContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider><DemoProvider>{children}</DemoProvider></ThemeProvider>;
}
