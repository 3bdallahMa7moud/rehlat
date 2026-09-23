import type { DailyProgress, Task, TaskStatus } from "@/types/models";

/**
 * The product currently treats a partial task as 50% of a completed task.
 * Keep this value in one place so the dashboard, reports and ranking never
 * drift apart when the business rule changes.
 */
export const PARTIAL_COMPLETION_WEIGHT = 0.5;
/** @deprecated Use PARTIAL_COMPLETION_WEIGHT. */
export const DEFAULT_PARTIAL_PROGRESS_WEIGHT = PARTIAL_COMPLETION_WEIGHT;
export const DEFAULT_SUCCESS_THRESHOLD = 90;

export type ProgressTaskStatus = TaskStatus | "unknown";

export interface ProgressCalculationOptions {
  /** Weight applied to a task whose final outcome is partial (0..1). */
  partialWeight?: number;
  /** Percentage required for a day to be considered successful (0..100). */
  successThreshold?: number;
  /** Include closed tasks in the total instead of treating them as excluded. */
  includeClosedTasks?: boolean;
}

export interface ProgressBreakdown extends DailyProgress {
  /** Number of tasks that were explicitly marked not completed. */
  notCompleted: number;
  /** Number of tasks closed without an outcome. */
  closed: number;
  /** Sum of task weights before converting to a percentage. */
  weightedUnits: number;
  /** Configured threshold used to determine `isSuccessful`. */
  successThreshold: number;
  /** True when the weighted percentage meets the configured threshold. */
  isSuccessful: boolean;
  /** Per-task contribution, useful for explanations and reports. */
  contributions: ReadonlyArray<TaskProgressContribution>;
}

export interface TaskProgressContribution {
  taskId: string;
  status: ProgressTaskStatus;
  ratio: number;
  weight: number;
  actualMinutes: number;
}

const ACTIVE_STATUSES = new Set<TaskStatus>(["not_started", "running", "paused"]);

function finiteNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function clamp(value: number, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, finiteNumber(value)));
}

function normalizedWeight(value: number, fallback: number) {
  return clamp(finiteNumber(value, fallback), 0, 1);
}

/** Return the progress ratio of a single task, capped at 100%. */
export function calculateTaskRatio(task: Pick<Task, "target" | "current">) {
  const target = finiteNumber(task.target);
  const current = Math.max(0, finiteNumber(task.current));
  if (target <= 0) return current > 0 ? 100 : 0;
  return clamp((current / target) * 100);
}

/**
 * Convert a task outcome to the central weighted-progress rule. Runtime
 * statuses (running/paused) deliberately contribute zero until an outcome is
 * recorded, while a partial outcome contributes the configured fixed weight.
 */
export function getTaskProgressWeight(
  status: ProgressTaskStatus,
  options: Pick<ProgressCalculationOptions, "partialWeight"> = {},
) {
  const partialWeight = normalizedWeight(options.partialWeight ?? DEFAULT_PARTIAL_PROGRESS_WEIGHT, DEFAULT_PARTIAL_PROGRESS_WEIGHT);
  if (status === "completed") return 1;
  if (status === "partial") return partialWeight;
  return 0;
}

export function getTaskProgressContribution(
  task: Pick<Task, "id" | "status" | "target" | "current" | "actualMinutes">,
  options: Pick<ProgressCalculationOptions, "partialWeight"> = {},
): TaskProgressContribution {
  return {
    taskId: task.id,
    status: task.status,
    ratio: calculateTaskRatio(task),
    weight: getTaskProgressWeight(task.status, options),
    actualMinutes: Math.max(0, finiteNumber(task.actualMinutes)),
  };
}

/**
 * Calculate all daily progress counters from the same task collection used by
 * the UI. The function is pure and therefore safe to call during SSR or in a
 * future backend adapter.
 */
export function calculateProgress(
  tasks: readonly Task[] = [],
  options: ProgressCalculationOptions = {},
): ProgressBreakdown {
  const includeClosedTasks = options.includeClosedTasks ?? true;
  const partialWeight = normalizedWeight(options.partialWeight ?? DEFAULT_PARTIAL_PROGRESS_WEIGHT, DEFAULT_PARTIAL_PROGRESS_WEIGHT);
  const successThreshold = clamp(options.successThreshold ?? DEFAULT_SUCCESS_THRESHOLD);
  const source = tasks.filter((task) => includeClosedTasks || task.status !== "closed");
  const completed = source.filter((task) => task.status === "completed").length;
  const partial = source.filter((task) => task.status === "partial").length;
  const remaining = source.filter((task) => ACTIVE_STATUSES.has(task.status)).length;
  const notCompleted = source.filter((task) => task.status === "not_completed").length;
  const closed = source.filter((task) => task.status === "closed").length;
  const actualMinutes = source.reduce((total, task) => total + Math.max(0, finiteNumber(task.actualMinutes)), 0);
  const contributions = source.map((task) => getTaskProgressContribution(task, { partialWeight }));
  const weightedUnits = contributions.reduce((total, contribution) => total + contribution.weight, 0);
  const percent = source.length ? Math.round(clamp((weightedUnits / source.length) * 100)) : 0;

  return {
    percent,
    completed,
    partial,
    remaining,
    total: source.length,
    actualMinutes,
    notCompleted,
    closed,
    weightedUnits,
    successThreshold,
    isSuccessful: percent >= successThreshold,
    contributions,
  };
}

/** Descriptive alias used by report and backend-facing code. */
export const calculateDailyProgress = calculateProgress;

/** A small helper for components that only need the displayed percentage. */
export function getProgressPercentage(tasks: readonly Task[] = [], options: ProgressCalculationOptions = {}) {
  return calculateProgress(tasks, options).percent;
}
