import type { ActivityEvent, EncouragementMessage } from "@/types/models";

export const activityEvents: ActivityEvent[] = [
  { id: "activity-1", participantId: "noura", participantName: "نورة", initials: "نو", avatarColor: "teal", action: "أنجزت", task: "أذكار المساء", createdAt: "2026-09-22T09:58:00.000Z", kind: "completed" },
  { id: "activity-2", participantId: "razi", participantName: "رازي", initials: "رز", avatarColor: "navy", action: "أوقف مؤقتًا", task: "ورد القرآن", createdAt: "2026-09-22T09:52:00.000Z", kind: "paused" },
  { id: "activity-3", participantId: "sara", participantName: "سارة", initials: "سر", avatarColor: "mint", action: "بدأت", task: "مشي سريع", createdAt: "2026-09-21T17:42:00.000Z", kind: "started" },
  { id: "activity-4", participantId: "khalid", participantName: "خالد", initials: "خل", avatarColor: "amber", action: "دخل إلى النظام", task: "", createdAt: "2026-09-21T17:31:00.000Z", kind: "joined" },
];

export const encouragements: EncouragementMessage[] = [
  { id: "enc-1", sender: "نورة", initials: "نو", avatarColor: "teal", message: "كفو عليك 🔥 باقي لك مهمة واحدة ونقفل اليوم كامل.", createdAt: "2026-09-22T09:48:00.000Z" },
  { id: "enc-2", sender: "المشرف", initials: "مش", avatarColor: "navy", message: "ثباتك اليوم جميل، خذ الخطوة التالية بهدوء.", createdAt: "2026-09-21T18:00:00.000Z" },
];
