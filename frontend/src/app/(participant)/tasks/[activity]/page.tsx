import { notFound } from "next/navigation";
import { AppRoute } from "@/components/layout/AppRoute";
import type { TaskType } from "@/types/models";

const taskTypes: TaskType[] = ["quran", "prayer", "adhkar", "reading", "sport", "water", "sleep", "general"];

export default async function ActivityTaskPage({ params }: { params: Promise<{ activity: string }> }) {
  const { activity } = await params;
  if (!taskTypes.includes(activity as TaskType)) notFound();
  return <AppRoute page="tasks" taskType={activity as TaskType} />;
}
