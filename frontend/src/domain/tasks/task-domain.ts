import type { DayStatus, Task, TaskDetail, TaskStatus } from "../../types/models.ts";
import { getTaskDetailElapsedSeconds, getTaskElapsedSeconds } from "../../lib/task-details.ts";
import { getTaskEarnedPoints } from "../../lib/points.ts";

export type TaskOutcome = "completed" | "partial" | "not_completed" | "closed";

export function deriveDayStatus(tasks: readonly Task[]): DayStatus {
  if (!tasks.length || tasks.every((task) => task.status === "not_started")) return "not_started";
  if (tasks.every((task) => ["completed", "partial", "not_completed", "closed"].includes(task.status))) return "complete";
  return tasks.some((task) => task.status === "running" || task.status === "paused") ? "in_progress" : "started";
}

export function taskFromDetails(task: Task, detailItems: TaskDetail[]): Task {
  const completedCount = detailItems.filter((detail) => detail.status === "completed").length;
  const hasPartial = detailItems.some((detail) => detail.status === "partial");
  const hasRunning = detailItems.some((detail) => detail.status === "running");
  const hasPaused = detailItems.some((detail) => detail.status === "paused");
  const status: TaskStatus = completedCount === detailItems.length && detailItems.length > 0 ? "completed" : hasPartial || completedCount > 0 ? "partial" : hasRunning ? "running" : hasPaused ? "paused" : "not_started";
  const current = detailItems.length === 1 ? detailItems[0].current : completedCount;
  return { ...task, detailItems, current: Math.max(0, Math.min(task.target, current)), status, actualMinutes: Math.round(getTaskElapsedSeconds({ detailItems, actualMinutes: task.actualMinutes }) / 60) };
}

export function transitionTaskStatus(task: Task, status: TaskStatus, updatedAt: string): Task {
  if (status !== "running" && status !== "paused") return task;
  if (task.status === status) return task;
  const details = task.detailItems?.map((detail) => status === "paused" && detail.status === "running"
    ? { ...detail, status: "paused" as const, elapsedSeconds: getTaskDetailElapsedSeconds(detail), lastStartedAt: undefined }
    : detail);
  if (status === "running" && details?.length && !details.some((detail) => detail.status === "running")) {
    const next = details.find((detail) => !["completed", "not_completed"].includes(detail.status));
    if (next) return { ...task, status, detailItems: details.map((detail) => detail.id === next.id ? { ...detail, status: "running" as const, lastStartedAt: updatedAt } : detail) };
  }
  return { ...task, status, ...(details ? { detailItems: details } : {}) };
}

export function transitionTaskDetail(task: Task, detailId: string, action: "start" | "pause" | TaskOutcome, updatedAt: string): Task | null {
  const detail = task.detailItems?.find((item) => item.id === detailId);
  if (!detail || ["completed", "not_completed"].includes(detail.status)) return null;
  if (action === "start") return taskFromDetails(task, task.detailItems!.map((item) => item.id === detailId ? { ...item, status: "running" as const, lastStartedAt: updatedAt } : item));
  const elapsedSeconds = getTaskDetailElapsedSeconds(detail);
  if (action === "pause") return detail.status === "running" ? taskFromDetails(task, task.detailItems!.map((item) => item.id === detailId ? { ...item, status: "paused" as const, elapsedSeconds, lastStartedAt: undefined } : item)) : null;
  const current = action === "completed" ? detail.target : detail.current;
  return taskFromDetails(task, task.detailItems!.map((item) => item.id === detailId ? { ...item, current, status: action, elapsedSeconds, lastStartedAt: undefined } : item));
}

export function completeTaskOutcome(task: Task, outcome: TaskOutcome): Task | null {
  if (["completed", "not_completed", "closed"].includes(task.status)) return null;
  if (task.type === "prayer" && task.detailItems?.length && !["not_completed", "closed"].includes(outcome)) return null;
  const actualMinutes = outcome === "completed" ? Math.max(task.actualMinutes, task.durationMinutes ?? task.actualMinutes) : task.actualMinutes;
  const details = outcome === "completed" && task.detailItems?.length ? task.detailItems.map((detail) => ({ ...detail, current: detail.target, status: "completed" as const, lastStartedAt: undefined })) : task.detailItems;
  const next = details ? taskFromDetails({ ...task, actualMinutes }, details) : { ...task, status: outcome, current: outcome === "completed" ? task.target : task.current, actualMinutes };
  return { ...next, awardedPoints: getTaskEarnedPoints(next) };
}

export function updateMeasuredTaskProgress(task: Task, current: number): Task {
  const nextCurrent = Math.max(0, Math.min(current, task.target));
  const status: TaskStatus = nextCurrent <= 0
    ? "not_started"
    : nextCurrent >= task.target
      ? "completed"
      : task.status === "running" || task.status === "paused"
        ? task.status
        : "partial";
  const details = task.detailItems?.length === 1
    ? task.detailItems.map((detail) => ({ ...detail, current: nextCurrent, status: status === "completed" ? "completed" as const : status }))
    : task.detailItems?.map((detail, index) => index < nextCurrent ? { ...detail, current: detail.target, status: "completed" as const } : detail.status === "completed" ? { ...detail, current: 0, status: "not_started" as const } : detail);
  const next = details ? taskFromDetails({ ...task, current: nextCurrent, status }, details) : { ...task, current: nextCurrent, status };
  return { ...next, awardedPoints: getTaskEarnedPoints(next) };
}

export function completeAllTasks(tasks: readonly Task[]): { tasks: Task[]; scoreDelta: number } {
  let scoreDelta = 0;
  const next = tasks.map((task) => {
    const completed = completeTaskOutcome(task, "completed");
    if (!completed) return task;
    scoreDelta += (completed.awardedPoints ?? 0) - (task.awardedPoints ?? 0);
    return completed;
  });
  return { tasks: next, scoreDelta };
}
