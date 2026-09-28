import { AdminTaskEditor } from "@/components/features/AdminTaskStudio";
import { AnimatedPage } from "@/components/layout/AnimatedPage";
import { AppShell } from "@/components/layout/AppShell";

export default function NewAdminTaskPage() {
  return <AppShell><AnimatedPage><AdminTaskEditor /></AnimatedPage></AppShell>;
}
