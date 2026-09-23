import type { Task, TaskStatus } from "@/types/models";
import { calculateStreak, type CalculatedStreak, type StreakHistoryDay } from "@/lib/streak";

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365] as const;

export interface TaskStreakEntry {
  taskId: string;
  taskTitle: string;
  current: number;
  best: number;
  successfulDays: number;
  history: StreakHistoryDay[];
  title: string;
  nextMilestone?: number;
  milestoneProgress: number;
  isTodaySuccessful: boolean;
  isTodayPending: boolean;
  isAtRisk: boolean;
  reason: string;
}

export interface StreakTitle {
  label: string;
  days: number;
  nextMilestone?: number;
  progress: number;
}

function milestoneFor(days: number) {
  return STREAK_MILESTONES.filter((milestone) => milestone <= days).at(-1) ?? 0;
}

export function getGeneralStreakTitle(days: number): StreakTitle {
  const nextMilestone = STREAK_MILESTONES.find((milestone) => milestone > days);
  const previous = milestoneFor(days);
  const progress = nextMilestone ? Math.round(((days - previous) / Math.max(1, nextMilestone - previous)) * 100) : 100;
  const label = days >= 365 ? "أسطورة الاستمرارية" : days >= 100 ? "قمة الالتزام" : days >= 60 ? "صاحب عادة راسخة" : days >= 30 ? "صاحب عادة" : days >= 14 ? "مداوم" : days >= 7 ? "ملتزم" : days >= 3 ? "بداية قوية" : "بداية الرحلة";
  return { label, days, nextMilestone, progress };
}

export function getTaskStreakTitle(days: number, taskTitle: string) {
  const base = getGeneralStreakTitle(days);
  return { ...base, label: days >= 30 ? `${taskTitle} — ${base.label}` : `${taskTitle} — مداوم` };
}

function statusToRecord(status: TaskStatus) {
  if (status === "completed") return { status: "successful" as const, successful: true };
  if (status === "partial") return { status: "partial" as const, successful: false };
  if (["not_completed", "closed"].includes(status)) return { status: "unsuccessful" as const, successful: false };
  return { status: "today" as const, successful: false };
}

function taskStreakFromRecords(task: Task, records: Array<{ localDate: string; status: TaskStatus }>, today: string): TaskStreakEntry {
  const calculated: CalculatedStreak = calculateStreak(records.map((record) => ({ date: record.localDate, ...statusToRecord(record.status) })), { today });
  const title = getTaskStreakTitle(calculated.current, task.title);
  return {
    taskId: task.id,
    taskTitle: task.title,
    current: calculated.current,
    best: calculated.best,
    successfulDays: calculated.successfulDays,
    history: calculated.history,
    title: title.label,
    nextMilestone: title.nextMilestone,
    milestoneProgress: title.progress,
    isTodaySuccessful: calculated.isTodaySuccessful,
    isTodayPending: calculated.isTodayPending,
    isAtRisk: calculated.isAtRisk,
    reason: calculated.reason,
  };
}

export function calculateTaskStreaks(tasks: readonly Task[], records: readonly { taskId: string; localDate: string; status: TaskStatus }[], today: string) {
  return tasks.map((task) => taskStreakFromRecords(task, records.filter((record) => record.taskId === task.id), today));
}
