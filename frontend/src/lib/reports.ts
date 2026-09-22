import type { DailyProgress, Participant, Report, ReportPoint, RankingEntry, Task } from "@/types/models";
import { calculateProgress, clamp, DEFAULT_SUCCESS_THRESHOLD, type ProgressBreakdown } from "./progress";

export type ReportPeriod = Report["period"];

export interface ReportDay {
  date?: string;
  label?: string;
  progress?: number;
  minutes?: number;
  successful?: boolean;
  successfulWeeks?: number;
}

export interface ReportCalculationInput {
  period?: ReportPeriod;
  tasks?: readonly Task[];
  progress?: Partial<DailyProgress> & { isSuccessful?: boolean };
  dailyResults?: readonly ReportDay[];
  rankings?: readonly RankingEntry[];
  previous?: Report | ReportCalculationInput;
  successThreshold?: number;
  successfulWeeks?: number;
  weekNumber?: number;
  title?: string;
}

export interface CalculatedReport extends Report {
  completedTasks: number;
  partialTasks: number;
  remainingTasks: number;
  notCompletedTasks: number;
  successfulWeeks: number;
  isSuccessful: boolean;
  successThreshold: number;
  completionRateDelta?: number;
  totalMinutesDelta?: number;
  previousCompletionRate?: number;
  previousTotalMinutes?: number;
  bestParticipant?: Pick<Participant, "id" | "name">;
  weekNumber?: number;
}

function finite(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function round(value: number, decimals = 0) {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

function periodLabel(period: ReportPeriod, index: number) {
  return period === "daily" ? "اليوم" : period === "weekly" ? `أسبوع ${index + 1}` : `جزء ${index + 1}`;
}

function pointsFromDays(days: readonly ReportDay[], period: ReportPeriod, fallbackProgress: number, fallbackMinutes: number): ReportPoint[] {
  if (days.length) {
    return days.map((day, index) => ({
      label: day.label ?? day.date ?? periodLabel(period, index),
      progress: clamp(finite(day.progress, fallbackProgress)),
      minutes: Math.max(0, finite(day.minutes, 0)),
    }));
  }
  return [{ label: period === "daily" ? "اليوم" : period === "weekly" ? "الأسبوع" : "الشهر", progress: fallbackProgress, minutes: fallbackMinutes }];
}

function normalizeInput(input: readonly Task[] | ReportCalculationInput, options: ReportCalculationInput): ReportCalculationInput {
  return Array.isArray(input) ? { ...options, tasks: input } : { ...input, ...options };
}

/** Build one report from a task snapshot and optional historical day results. */
export function calculateReport(tasks: readonly Task[], options?: ReportCalculationInput): CalculatedReport;
export function calculateReport(input: ReportCalculationInput): CalculatedReport;
export function calculateReport(input: readonly Task[] | ReportCalculationInput, options: ReportCalculationInput = {}): CalculatedReport {
  const source = normalizeInput(input, options);
  const period = source.period ?? "daily";
  const tasks = source.tasks ?? [];
  const calculated: ProgressBreakdown = calculateProgress(tasks, { successThreshold: source.successThreshold ?? DEFAULT_SUCCESS_THRESHOLD });
  const days = source.dailyResults ?? [];
  const progressRate = typeof source.progress?.percent === "number"
    ? clamp(source.progress.percent)
    : days.length
      ? round(days.reduce((sum, day) => sum + clamp(finite(day.progress)), 0) / days.length)
      : calculated.percent;
  const totalMinutes = typeof source.progress?.actualMinutes === "number"
    ? Math.max(0, source.progress.actualMinutes)
    : days.length
      ? days.reduce((sum, day) => sum + Math.max(0, finite(day.minutes)), 0)
      : calculated.actualMinutes;
  const averageProgress = days.length
    ? round(days.reduce((sum, day) => sum + clamp(finite(day.progress)), 0) / days.length)
    : progressRate;
  const longestTask = tasks.reduce<Task | undefined>((current, task) => {
    if (!current || finite(task.actualMinutes) > finite(current.actualMinutes)) return task;
    return current;
  }, undefined);
  const successfulDays = typeof source.progress?.isSuccessful === "boolean"
    ? source.progress.isSuccessful ? 1 : 0
    : days.length
      ? days.filter((day) => day.successful ?? clamp(finite(day.progress)) >= (source.successThreshold ?? DEFAULT_SUCCESS_THRESHOLD)).length
      : progressRate >= (source.successThreshold ?? DEFAULT_SUCCESS_THRESHOLD) ? 1 : 0;
  const successfulWeeks = Math.max(0, Math.round(source.successfulWeeks ?? days.reduce((sum, day) => sum + finite(day.successfulWeeks), 0)));
  const previous = source.previous ? calculateReport(source.previous) : undefined;
  const firstRanking = source.rankings?.[0];
  const report: CalculatedReport = {
    period,
    completionRate: round(progressRate),
    totalMinutes: round(totalMinutes),
    successfulDays,
    averageProgress: round(averageProgress),
    mostTimeConsumingTask: longestTask?.title ?? "—",
    rankingSummary: firstRanking ? `المركز ${firstRanking.rank}: ${firstRanking.name}` : "لا يوجد ترتيب بعد",
    points: pointsFromDays(days, period, round(progressRate), round(totalMinutes)),
    completedTasks: source.progress?.completed ?? calculated.completed,
    partialTasks: source.progress?.partial ?? calculated.partial,
    remainingTasks: source.progress?.remaining ?? calculated.remaining,
    notCompletedTasks: calculated.notCompleted,
    successfulWeeks,
    isSuccessful: progressRate >= (source.successThreshold ?? DEFAULT_SUCCESS_THRESHOLD),
    successThreshold: source.successThreshold ?? DEFAULT_SUCCESS_THRESHOLD,
    ...(source.weekNumber === undefined ? {} : { weekNumber: Math.min(5, Math.max(1, Math.round(source.weekNumber))) }),
    ...(previous ? {
      previousCompletionRate: previous.completionRate,
      previousTotalMinutes: previous.totalMinutes,
      completionRateDelta: round(progressRate - previous.completionRate),
      totalMinutesDelta: round(totalMinutes - previous.totalMinutes),
    } : {}),
  };
  return firstRanking
    ? { ...report, bestParticipant: { id: firstRanking.participantId, name: firstRanking.name } }
    : report;
}

export interface ReportsCalculationInput extends Omit<ReportCalculationInput, "period" | "previous"> {
  daily?: ReportCalculationInput;
  weekly?: ReportCalculationInput;
  monthly?: ReportCalculationInput;
}

export function calculateReports(input: ReportsCalculationInput = {}): Record<ReportPeriod, CalculatedReport> {
  return {
    daily: calculateReport({ ...input, ...(input.daily ?? {}), period: "daily" }),
    weekly: calculateReport({ ...input, ...(input.weekly ?? {}), period: "weekly" }),
    monthly: calculateReport({ ...input, ...(input.monthly ?? {}), period: "monthly" }),
  };
}

export const createReport = calculateReport;
export const calculateReportData = calculateReport;

