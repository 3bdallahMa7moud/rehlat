import type { Task } from "@/types/models";

export const initialTasks: Task[] = [
  { id: "prayer", title: "المحافظة على الصلوات", category: "faith", type: "prayer", group: "morning", goalLabel: "الصلوات المكتملة", target: 5, current: 3, unit: "صلوات", actualMinutes: 18, status: "running", supportingText: "الفجر والظهر والعصر مكتملة", scheduledTime: "طوال اليوم" },
  { id: "quran", title: "ورد القرآن", category: "faith", type: "quran", group: "morning", goalLabel: "الصفحات المستهدفة", target: 8, current: 5, unit: "صفحات", durationMinutes: 25, actualMinutes: 17, status: "paused", supportingText: "من سورة الكهف", scheduledTime: "بعد الفجر" },
  { id: "adhkar", title: "أذكار الصباح", category: "faith", type: "adhkar", group: "morning", goalLabel: "الأذكار", target: 1, current: 1, unit: "جلسة", durationMinutes: 8, actualMinutes: 8, status: "completed", scheduledTime: "بعد الفجر" },
  { id: "reading", title: "قراءة الكتاب", category: "culture", type: "reading", goalLabel: "الصفحات المستهدفة", target: 20, current: 12, unit: "صفحة", durationMinutes: 35, actualMinutes: 22, status: "not_started", supportingText: "كتاب: العادات الذرية" },
  { id: "sport", title: "مشي سريع", category: "sport", type: "sport", goalLabel: "المدة المستهدفة", target: 30, current: 0, unit: "دقيقة", durationMinutes: 30, actualMinutes: 0, status: "not_started", supportingText: "الممشى القريب" },
  { id: "water", title: "شرب الماء", category: "health", type: "water", goalLabel: "الأكواب اليومية", target: 8, current: 5, unit: "أكواب", actualMinutes: 0, status: "partial", supportingText: "وزّعها بهدوء خلال اليوم" },
  { id: "skill", title: "تطبيق المهارة", category: "skill", type: "general", goalLabel: "التركيز المستهدف", target: 45, current: 0, unit: "دقيقة", durationMinutes: 45, actualMinutes: 0, status: "not_started", supportingText: "دورة التصميم" },
  { id: "family", title: "جلسة مع الأهل", category: "family", type: "general", goalLabel: "الوقت المستهدف", target: 20, current: 0, unit: "دقيقة", durationMinutes: 20, actualMinutes: 0, status: "not_started", supportingText: "بدون هاتف" },
  { id: "sleep", title: "نوم مبكر", category: "health", type: "sleep", goalLabel: "ساعات النوم", target: 8, current: 0, unit: "ساعات", actualMinutes: 0, status: "not_started", supportingText: "قبل 11:00 م" },
];
