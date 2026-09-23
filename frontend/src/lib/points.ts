import type { Task, TaskType } from "@/types/models";
import { PARTIAL_COMPLETION_WEIGHT } from "./progress.ts";

/** Sensible defaults for tasks created before the points fields existed. */
export const DEFAULT_TASK_POINTS: Record<TaskType, number> = {
  prayer: 25,
  quran: 10,
  adhkar: 10,
  reading: 10,
  sport: 10,
  water: 8,
  sleep: 10,
  general: 5,
};

export function getTaskFullPoints(task: Pick<Task, "type" | "fullPoints">) {
  const value = task.fullPoints ?? DEFAULT_TASK_POINTS[task.type] ?? DEFAULT_TASK_POINTS.general;
  return Math.max(0, Math.round(Number.isFinite(value) ? value : DEFAULT_TASK_POINTS.general));
}

export function getTaskPartialPoints(task: Pick<Task, "type" | "fullPoints" | "partialPoints">) {
  return getTaskFullPoints(task) * PARTIAL_COMPLETION_WEIGHT;
}

/** Points earned by a task result; active states intentionally earn nothing. */
export function getTaskEarnedPoints(task: Pick<Task, "type" | "fullPoints" | "partialPoints" | "status" | "target" | "current" | "detailItems">) {
  const full = getTaskFullPoints(task);
  if (task.status === "not_completed" || task.status === "closed") return 0;
  if (task.status === "completed") return full;
  if (task.status === "partial" && task.type !== "prayer") return full * PARTIAL_COMPLETION_WEIGHT;
  if (task.detailItems?.length) return task.detailItems.reduce((sum, detail) => {
    if (detail.status === "completed") return sum + detail.fullPoints;
    if (detail.status !== "partial") return sum;
    return sum + detail.fullPoints * PARTIAL_COMPLETION_WEIGHT;
  }, 0);
  return 0;
}
export function withTaskPoints(task: Task): Task {
  const fullPoints = getTaskFullPoints(task);
  return { ...task, fullPoints, partialPoints: getTaskPartialPoints({ ...task, fullPoints }), awardedPoints: task.awardedPoints ?? 0 };
}
