import type { CalculatedStreak, StreakStatus } from "./streak.ts";
import type { TaskStatus } from "@/types/models";

export type TaskStreakFilter = "all" | "active" | "broken" | "today";

/** Filters task streaks by their real streak state and the task's state today. */
export function matchesTaskStreakFilter(filter: TaskStreakFilter, taskStatus: TaskStatus, streak: Pick<CalculatedStreak, "current" | "reason">) {
  if (filter === "all") return true;
  if (filter === "active") return streak.current > 0;
  if (filter === "broken") return streak.reason === "streak_broken";
  return taskStatus === "not_started";
}

/** Keeps today's task label distinct from an unfinished streak. */
export function getTaskStreakStatusLabel(taskStatus: TaskStatus, streak: Pick<CalculatedStreak, "reason">) {
  if (taskStatus === "completed") return "مستمرة";
  if (taskStatus === "running") return "قيد التنفيذ";
  if (taskStatus === "paused") return "متوقفة مؤقتًا";
  if (taskStatus === "partial") return "إنجاز جزئي";
  if (taskStatus === "not_started") return "لم تبدأ اليوم";
  return streak.reason === "streak_broken" ? "انقطعت" : taskStatus === "closed" ? "أُغلقت" : "لم تُنجز";
}

export function getTaskStreakTodayLabel(taskStatus: TaskStatus) {
  if (taskStatus === "completed") return "مستمر";
  if (taskStatus === "running") return "قيد التنفيذ";
  if (taskStatus === "paused") return "متوقفة";
  if (taskStatus === "partial") return "إنجاز جزئي";
  if (taskStatus === "not_started") return "لم يبدأ";
  return "انقطع";
}

export function getTaskStreakPresentation(streak: Pick<CalculatedStreak, "current" | "isTodaySuccessful" | "isAtRisk">) {
  if (streak.isTodaySuccessful) return { tone: "success" as const, body: "\u062a\u0645 \u062a\u0633\u062c\u064a\u0644 \u0646\u062c\u0627\u062d \u0647\u0630\u0647 \u0627\u0644\u0645\u0647\u0645\u0629 \u0627\u0644\u064a\u0648\u0645." };
  if (streak.isAtRisk) return { tone: "warning" as const, body: "\u0644\u0645 \u064a\u064f\u0633\u062c\u0644 \u0646\u062c\u0627\u062d \u0647\u0630\u0647 \u0627\u0644\u0645\u0647\u0645\u0629 \u0644\u0644\u064a\u0648\u0645 \u0628\u0639\u062f." };
  if (streak.current > 0) return { tone: "teal" as const, body: "\u0627\u0633\u062a\u0645\u0631\u0627\u0631\u064a\u062a\u0643 \u0627\u0644\u062d\u0627\u0644\u064a\u0629 \u0645\u062d\u0641\u0648\u0638\u0629 \u062d\u062a\u0649 \u0627\u0644\u0622\u0646." };
  return { tone: "neutral" as const, body: "\u0627\u0628\u062f\u0623 \u0633\u0644\u0633\u0644\u0629 \u062c\u062f\u064a\u062f\u0629 \u0628\u062e\u0637\u0648\u0629 \u0627\u0644\u064a\u0648\u0645." };
}

export function getDayCompletionPresentation(dayStatus: string, progressPercent: number) {
  if (dayStatus === "complete" && progressPercent >= 100) return { kind: "full" as const, tone: "success" as const };
  if (dayStatus === "complete") return { kind: "terminal-incomplete" as const, tone: "teal" as const };
  return { kind: "active" as const, tone: "neutral" as const };
}

export function getStreakDayLabel(date: string, status: StreakStatus) {
  const labels: Record<StreakStatus, string> = { successful: "\u0625\u0646\u062c\u0627\u0632 \u0646\u0627\u062c\u062d", partial: "\u0625\u0646\u062c\u0627\u0632 \u062c\u0632\u0626\u064a", unsuccessful: "\u0644\u0645 \u064a\u0643\u062a\u0645\u0644", today: "\u0627\u0644\u064a\u0648\u0645 \u0642\u064a\u062f \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629", future: "\u064a\u0648\u0645 \u0642\u0627\u062f\u0645" };
  return `${date} — ${labels[status]}`;
}
