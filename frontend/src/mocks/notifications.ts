import type { AppNotification } from "@/types/models";

export const notifications: AppNotification[] = [
  { id: "notice-1", kind: "warning", title: "حافظ على سلسلتك", body: "باقي مهمة واحدة حتى تسجل اليوم بنجاح.", createdAt: "2026-09-22T10:00:00.000Z", persistent: true, read: false },
  { id: "notice-2", kind: "encouragement", title: "رسالة تشجيع جديدة", body: "نورة تشجعك على إنهاء القراءة.", createdAt: "2026-09-22T09:48:00.000Z", read: false },
  { id: "notice-3", kind: "success", title: "أذكار الصباح مكتملة", body: "أحسنت، أضفت 8 دقائق لوقتك الفعلي.", createdAt: "2026-09-22T05:30:00.000Z", read: true },
];
