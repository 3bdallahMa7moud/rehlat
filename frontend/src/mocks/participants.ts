import type { Participant } from "@/types/models";

export const participants: Participant[] = [
  { id: "razi", name: "رازي", initials: "رز", avatarColor: "violet", role: "participant", presence: "active", currentStatus: "في جلسة تركيز", currentTask: "قراءة الكتاب", progress: 68, streak: 12, score: 845, pin: "1234" },
  { id: "noura", name: "نورة", initials: "نو", avatarColor: "teal", role: "participant", presence: "active", currentStatus: "تنجز مهامها", currentTask: "الرياضة", progress: 82, streak: 18, score: 960, pin: "2468" },
  { id: "sara", name: "سارة", initials: "سر", avatarColor: "mint", role: "participant", presence: "paused", currentStatus: "استراحة قصيرة", currentTask: "ورد القرآن", progress: 74, streak: 9, score: 880, pin: "1357" },
  { id: "khalid", name: "خالد", initials: "خل", avatarColor: "amber", role: "participant", presence: "idle", currentStatus: "متصل الآن", progress: 54, streak: 6, score: 710, pin: "4321" },
  { id: "admin", name: "المشرف", initials: "مش", avatarColor: "violet", role: "admin", presence: "active", currentStatus: "إدارة المجموعة", progress: 0, streak: 0, score: 0, pin: "0000" },
];

export const recentParticipantIds = ["razi", "noura", "sara"];
