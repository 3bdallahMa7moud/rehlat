import type { ActivityEvent, EncouragementMessage } from "@/types/models";

export const activityEvents: ActivityEvent[] = [
  { id: "activity-1", participantId: "noura", participantName: "نورة", initials: "نو", avatarColor: "teal", action: "أنجزت", task: "أذكار المساء", time: "منذ دقيقتين", kind: "completed" },
  { id: "activity-2", participantId: "razi", participantName: "رازي", initials: "رز", avatarColor: "violet", action: "أوقف مؤقتًا", task: "ورد القرآن", time: "منذ 8 دقائق", kind: "paused" },
  { id: "activity-3", participantId: "sara", participantName: "سارة", initials: "سر", avatarColor: "mint", action: "بدأت", task: "مشي سريع", time: "8:42 م", kind: "started" },
  { id: "activity-4", participantId: "khalid", participantName: "خالد", initials: "خل", avatarColor: "amber", action: "دخل إلى النظام", task: "", time: "8:31 م", kind: "joined" },
];

export const encouragements: EncouragementMessage[] = [
  { id: "enc-1", sender: "نورة", initials: "نو", avatarColor: "teal", message: "كفو عليك 🔥 باقي لك مهمة واحدة ونقفل اليوم كامل.", time: "منذ 12 دقيقة" },
  { id: "enc-2", sender: "المشرف", initials: "مش", avatarColor: "violet", message: "ثباتك اليوم جميل، خذ الخطوة التالية بهدوء.", time: "أمس" },
];
