import type { Report } from "@/types/models";

export const reports: Record<Report["period"], Report> = {
  daily: {
    period: "daily", completionRate: 68, totalMinutes: 65, successfulDays: 0, averageProgress: 68,
    mostTimeConsumingTask: "قراءة الكتاب", rankingSummary: "المركز الثالث اليوم",
    points: [{ label: "ص", progress: 25, minutes: 12 }, { label: "ظ", progress: 48, minutes: 28 }, { label: "م", progress: 68, minutes: 65 }, { label: "ل", progress: 82, minutes: 78 }],
  },
  weekly: {
    period: "weekly", completionRate: 74, totalMinutes: 420, successfulDays: 5, averageProgress: 74,
    mostTimeConsumingTask: "تطبيق المهارة", rankingSummary: "صعدت مركزًا هذا الأسبوع",
    points: [{ label: "س", progress: 62, minutes: 50 }, { label: "ح", progress: 71, minutes: 75 }, { label: "ن", progress: 82, minutes: 80 }, { label: "ث", progress: 65, minutes: 56 }, { label: "ر", progress: 74, minutes: 70 }, { label: "خ", progress: 85, minutes: 89 }, { label: "ج", progress: 76, minutes: 68 }],
  },
  monthly: {
    period: "monthly", completionRate: 71, totalMinutes: 1780, successfulDays: 20, averageProgress: 71,
    mostTimeConsumingTask: "قراءة الكتاب", rankingSummary: "ضمن أفضل 3 هذا الشهر",
    points: [{ label: "1", progress: 65, minutes: 365 }, { label: "2", progress: 74, minutes: 460 }, { label: "3", progress: 69, minutes: 418 }, { label: "4", progress: 77, minutes: 537 }],
  },
};
