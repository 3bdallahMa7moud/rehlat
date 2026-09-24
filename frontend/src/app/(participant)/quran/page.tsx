import { AnimatedPage } from "@/components/layout/AnimatedPage";
import { AppShell } from "@/components/layout/AppShell";
import { QuranReadingPage } from "@/components/features/QuranReadingPage";

export default function QuranPage() {
  return <AppShell><AnimatedPage><QuranReadingPage /></AnimatedPage></AppShell>;
}
