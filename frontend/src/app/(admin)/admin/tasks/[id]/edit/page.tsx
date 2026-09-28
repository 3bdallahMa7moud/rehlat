import { AdminTaskEditor } from "@/components/features/AdminTaskStudio";
import { AnimatedPage } from "@/components/layout/AnimatedPage";
import { AppShell } from "@/components/layout/AppShell";

export default async function EditAdminTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AppShell><AnimatedPage><AdminTaskEditor taskId={id} /></AnimatedPage></AppShell>;
}
