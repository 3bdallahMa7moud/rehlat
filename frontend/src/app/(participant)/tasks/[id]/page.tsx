import { AppRoute } from "@/components/layout/AppRoute";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AppRoute page="tasks" taskId={id} />;
}
