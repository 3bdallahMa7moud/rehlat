import type { Task, TaskConfig, TaskSchedule, TaskType } from "@/types/models";

export const prayerNames = ["الفجر", "الظهر", "العصر", "المغرب", "العشاء"] as const;

export function defaultTaskConfig(type: TaskType, task?: Pick<Task, "title" | "target" | "supportingText" | "group">): TaskConfig {
  switch (type) {
    case "quran": return { type, surah: 1, readingMode: "ayahs", batchSize: 5, reciter: "ar.alafasy" };
    case "prayer": return { type, prayers: [...prayerNames], includeSunnah: true, includeTasbeeh: true };
    case "adhkar": return { type, session: task?.group === "evening" ? "evening" : "morning", showTasbeeh: true };
    case "reading": return { type, bookName: task?.supportingText?.replace(/^كتاب:\s*/, "") ?? "", author: "", totalPages: 0, startPage: 1 };
    case "sport": return { type, activity: task?.supportingText ?? "", timerEnabled: true };
    case "water": return { type, targetMl: Math.max(250, (task?.target ?? 8) * 250), quickAmounts: [200, 250, 500], calculatorEnabled: true };
    case "sleep": return { type, bedtime: "22:30", wakeTime: "06:30", routineEnabled: true };
    case "general": return { type, tracking: "count", steps: [] };
  }
}

export function taskConfigFor(task: Task): TaskConfig {
  const fallback = defaultTaskConfig(task.type, task);
  return task.config?.type === task.type ? { ...fallback, ...task.config } as TaskConfig : fallback;
}

export function taskScheduleMatches(schedule: TaskSchedule | undefined, dateKey: string) {
  if (!schedule || schedule.mode === "daily") return true;
  if (schedule.mode === "once") return schedule.date === dateKey;
  const weekday = new Date(`${dateKey}T12:00:00.000Z`).getUTCDay();
  return schedule.weekdays.includes(weekday);
}

export function taskVisibleFor(task: Task, participantId: string, dateKey: string) {
  return !task.archived
    && (!task.assigneeIds?.length || task.assigneeIds.includes(participantId))
    && taskScheduleMatches(task.schedule, dateKey);
}

export function taskDefinitionSnapshot(task: Task): Task {
  return {
    ...task,
    current: 0,
    actualMinutes: 0,
    status: "not_started",
    awardedPoints: 0,
    details: undefined,
    detailItems: undefined,
  };
}
