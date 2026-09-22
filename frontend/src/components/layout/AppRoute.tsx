import { ProductPage, type ProductPageId } from "@/components/features/ProductPage";
import { AnimatedPage } from "@/components/layout/AnimatedPage";
import { AppShell } from "@/components/layout/AppShell";

export function AppRoute({ page, taskId, participantId }: { page: ProductPageId; taskId?: string; participantId?: string }) {
  return <AppShell><AnimatedPage><ProductPage page={page} taskId={taskId} participantId={participantId} /></AnimatedPage></AppShell>;
}
