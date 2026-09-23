import { getProjectDateKey } from "./date-time.ts";

export type DailyReflection = {
  id: string;
  title: string;
  body: string;
};

export const dailyReflections: readonly DailyReflection[] = [
  { id: "small-start", title: "ابدأ بأصغر خطوة", body: "ليس المطلوب يومًا مثاليًا؛ المطلوب أن تبقى قريبًا من الطريق." },
  { id: "movement", title: "لا تنتظر المزاج", body: "ابدأ، ثم دع الحركة تصنع حماسها بهدوء." },
  { id: "one-step", title: "خطوة واحدة تكفي", body: "اليوم لا يحتاج إلى أن يكون مثاليًا حتى يكون له أثر." },
  { id: "light-start", title: "خفف البداية", body: "اختر مهمة سهلة تفتح لك مساحة لبقية اليوم." },
  { id: "steady", title: "الاستمرار أهم من الكمال", body: "التقدم الهادئ يتراكم، حتى عندما لا يبدو كبيرًا في اللحظة نفسها." },
  { id: "return", title: "ارجع من حيث أنت", body: "إن انقطع الإيقاع، لا تحتاج إلى تعويض كل شيء دفعة واحدة." },
  { id: "attention", title: "امنح المهمة انتباهًا بسيطًا", body: "بضع دقائق صادقة قد تكون أفضل من خطة كبيرة مؤجلة." },
  { id: "pace", title: "اختر وتيرتك", body: "الرحلة المستمرة لا تحتاج إلى استعجال، بل إلى وضوح الخطوة التالية." },
  { id: "enough", title: "افعل ما يكفي الآن", body: "إنجاز مناسب لظروف اليوم أفضل من انتظار وقت مثالي." },
  { id: "calm", title: "رتّب البداية بهدوء", body: "اختر شيئًا واحدًا مهمًا، ثم اترك الباقي لوقته." },
  { id: "presence", title: "ابق قريبًا من نيتك", body: "تذكير قصير بسبب البداية قد يعيد لك الاتجاه." },
  { id: "time", title: "الوقت الصغير له قيمة", body: "ما تحفظه من دقائق اليوم يصنع فرقًا مع الاستمرار." },
] as const;

/** Maps a project calendar day to a stable array index without randomness. */
export function getDailyReflectionIndex(dateKey: string, count = dailyReflections.length) {
  if (count < 1) return 0;
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 0;
  const [, year, month, day] = match;
  const ordinal = Math.floor(Date.UTC(Number(year), Number(month) - 1, Number(day)) / 86_400_000);
  return ((ordinal % count) + count) % count;
}

export function getDailyReflection(date: Date | string | number = new Date()): DailyReflection {
  return dailyReflections[getDailyReflectionIndex(getProjectDateKey(date))];
}
