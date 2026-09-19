import type { Achievement, RankingEntry, Title } from "@/types/models";

export const rankingEntries: RankingEntry[] = [
  { participantId: "noura", rank: 1, name: "نورة", initials: "نو", avatarColor: "teal", score: 960, progress: 82, streak: 18 },
  { participantId: "sara", rank: 2, name: "سارة", initials: "سر", avatarColor: "mint", score: 880, progress: 74, streak: 9 },
  { participantId: "razi", rank: 3, name: "رازي", initials: "رز", avatarColor: "violet", score: 845, progress: 68, streak: 12 },
  { participantId: "khalid", rank: 4, name: "خالد", initials: "خل", avatarColor: "amber", score: 710, progress: 54, streak: 6 },
];

export const achievements: Achievement[] = [
  { id: "ach-1", label: "حارس الزمرد", description: "أكمل 5 أيام متتالية بنجاح", symbol: "emerald", participantName: "نورة", initials: "نو", avatarColor: "teal" },
  { id: "ach-2", label: "سيد الاستمرارية", description: "حافظ على سلسلة 18 يومًا", symbol: "continuity", participantName: "نورة", initials: "نو", avatarColor: "teal" },
  { id: "ach-3", label: "رفيق القرآن", description: "أتم ورده 7 أيام متتابعة", symbol: "quran", participantName: "سارة", initials: "سر", avatarColor: "mint" },
];

export const titles: Title[] = [
  { id: "title-1", name: "حارس الزمرد", description: "للثبات الهادئ والالتزام اليومي", symbol: "emerald" },
  { id: "title-2", name: "سيد الاستمرارية", description: "لمن يحافظ على عاداته يومًا بعد يوم", symbol: "continuity" },
  { id: "title-3", name: "رفيق القرآن", description: "لصاحب الورد المتوازن", symbol: "quran" },
];
