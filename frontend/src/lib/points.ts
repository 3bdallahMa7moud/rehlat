import type { Task, TaskType } from "@/types/models";

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
  const explicit = task.partialPoints;
  if (typeof explicit === "number" && Number.isFinite(explicit)) return Math.max(0, Math.min(getTaskFullPoints(task), Math.round(explicit)));
  return Math.round(getTaskFullPoints(task) * 0.5);
}

export function taskProgressRatio(task: Pick<Task, "target" | "current">) {
  if (task.target <= 0) return task.current > 0 ? 1 : 0;
  return Math.max(0, Math.min(1, task.current / task.target));
}

/** Points earned by a task result; active states intentionally earn nothing. */
export function getTaskEarnedPoints(task: Pick<Task, "type" | "fullPoints" | "partialPoints" | "status" | "target" | "current" | "detailItems">) {
  if (task.detailItems?.length) return task.detailItems.reduce((sum, detail) => {
    if (detail.status === "completed") return sum + detail.fullPoints;
    if (detail.status !== "partial") return sum;
    const ratio = detail.target > 0 ? Math.max(0, Math.min(1, detail.current / detail.target)) : 0.5;
    return sum + Math.min(detail.fullPoints, Math.round(detail.fullPoints * ratio));
  }, 0);
  const full = getTaskFullPoints(task);
  if (task.status === "completed") return full;
  if (task.status !== "partial") return 0;
  const ratio = taskProgressRatio(task);
  if (ratio <= 0) return getTaskPartialPoints(task);
  const proportional = Math.round(full * ratio);
  return Math.min(full, proportional);
}

export function withTaskPoints(task: Task): Task {
  const fullPoints = getTaskFullPoints(task);
  return { ...task, fullPoints, partialPoints: getTaskPartialPoints({ ...task, fullPoints }), awardedPoints: task.awardedPoints ?? 0 };
}

