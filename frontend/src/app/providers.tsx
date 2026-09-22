"use client";

import { DemoProvider } from "@/state/DemoContext";
import { ThemeProvider } from "@/state/ThemeContext";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { Footer } from "@/components/layout/Footer";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider><DemoProvider><OfflineBanner />{children}<Footer /></DemoProvider></ThemeProvider>;
}
