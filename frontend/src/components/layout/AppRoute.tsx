import { ProductPage, type ProductPageId } from "@/components/features/ProductPage";
import { AnimatedPage } from "@/components/layout/AnimatedPage";
import { AppShell } from "@/components/layout/AppShell";
import type { TaskType } from "@/types/models";

export function AppRoute({ page, taskType, participantId }: { page: ProductPageId; taskType?: TaskType; participantId?: string }) {
  return <AppShell><AnimatedPage><ProductPage page={page} taskType={taskType} participantId={participantId} /></AnimatedPage></AppShell>;
}
