import type { AppNotification } from "@/types/models";

export const notifications: AppNotification[] = [
  { id: "notice-1", kind: "warning", title: "حافظ على سلسلتك", body: "باقي مهمة واحدة حتى تسجل اليوم بنجاح.", time: "الآن", persistent: true, read: false },
  { id: "notice-2", kind: "encouragement", title: "رسالة تشجيع جديدة", body: "نورة تشجعك على إنهاء القراءة.", time: "منذ 12 دقيقة", read: false },
  { id: "notice-3", kind: "success", title: "أذكار الصباح مكتملة", body: "أحسنت، أضفت 8 دقائق لوقتك الفعلي.", time: "صباحًا", read: true },
];
