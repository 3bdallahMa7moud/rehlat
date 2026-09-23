import type { RankingEntry } from "@/types/models";
import type { StreakTitle, TaskStreakEntry } from "@/lib/task-streaks";

type HistoryDay = { progress: number };

export type HonorTitleCard = {
  id: "emerald" | "continuity" | "quran";
  name: string;
  description: string;
  requirement: string;
  currentValue: number;
  threshold: number;
  earned: boolean;
  tone: "emerald" | "continuity" | "quran";
};

export function getEarnedTitleCards(input: { generalStreak: number; taskStreaks: readonly TaskStreakEntry[]; quranTaskId?: string }) {
  const quranStreak = input.quranTaskId ? input.taskStreaks.find((entry) => entry.taskId === input.quranTaskId)?.current : undefined;
  const cards: HonorTitleCard[] = [
    { id: "emerald", name: "حارس الزمرد", description: "استمرارية هادئة في الرحلة.", requirement: "أكمل 5 أيام متتالية بنجاح", currentValue: input.generalStreak, threshold: 5, earned: input.generalStreak >= 5, tone: "emerald" },
    { id: "continuity", name: "حارس الاستمرارية", description: "يحافظ على إيقاع ثابت يومًا بعد يوم.", requirement: "أكمل 7 أيام متتالية بنجاح", currentValue: input.generalStreak, threshold: 7, earned: input.generalStreak >= 7, tone: "continuity" },
  ];
  if (quranStreak !== undefined) cards.push({ id: "quran", name: "رفيق القرآن", description: "رفيق ثابت لورده القرآني.", requirement: "أكمل ورد القرآن 7 أيام متتالية", currentValue: quranStreak, threshold: 7, earned: quranStreak >= 7, tone: "quran" });
  return cards;
}

export function getPersonalHonorSummary(input: { generalStreakTitle: StreakTitle; successfulDays: number; historyDays: readonly HistoryDay[] }) {
  return { title: input.generalStreakTitle, hasCompletedDayAchievement: input.historyDays.some((day) => day.progress >= 100), successfulDays: input.successfulDays };
}

export type HonorHighlight = { id: "score" | "streak" | "progress"; label: string; context: string; value: number; leaders: RankingEntry[] };

function leadersFor(entries: readonly RankingEntry[], metric: (entry: RankingEntry) => number) {
  const value = Math.max(...entries.map(metric));
  return { value, leaders: entries.filter((entry) => metric(entry) === value) };
}

export function getHonorHighlights(rankings: readonly RankingEntry[]): HonorHighlight[] {
  if (!rankings.length) return [];
  const highestScore = leadersFor(rankings, (entry) => entry.score);
  const longestStreak = leadersFor(rankings, (entry) => entry.streak);
  const highestProgress = leadersFor(rankings, (entry) => entry.progress);
  return [
    { id: "score", label: "الأعلى نقاطًا حاليًا", context: "من النقاط الحالية للمجموعة", ...highestScore },
    { id: "streak", label: "أطول سلسلة حالية", context: "من سلاسل الاستمرارية الحالية", ...longestStreak },
    { id: "progress", label: "أعلى تقدم اليوم", context: "من تقدم اليوم المسجل", ...highestProgress },
  ];
}
