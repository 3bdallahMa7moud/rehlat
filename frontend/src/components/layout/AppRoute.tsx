import { ProductPage, type ProductPageId } from "@/components/features/ProductPage";
import { AnimatedPage } from "@/components/layout/AnimatedPage";
import { AppShell } from "@/components/layout/AppShell";

export function AppRoute({ page, taskId, participantId, reportView }: { page: ProductPageId; taskId?: string; participantId?: string; reportView?: "overview" | "participants" }) {
  return <AppShell><AnimatedPage><ProductPage page={page} taskId={taskId} participantId={participantId} reportView={reportView} /></AnimatedPage></AppShell>;
}
