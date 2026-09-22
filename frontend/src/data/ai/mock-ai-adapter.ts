import type { Participant, Task } from "../../types/models.ts";

export interface AIRequest {
  message: string;
  participant: Pick<Participant, "name">;
  tasks: readonly Task[];
  progress: { percent: number; completed: number; total: number; remaining: number };
  streak: number;
}

export interface AIResponse { content: string; }
export interface AIAdapter { sendMessage(input: AIRequest): Promise<AIResponse>; }

function createMockResponse(input: AIRequest): AIResponse {
  const normalized = input.message.trim().toLocaleLowerCase("ar");
  const remaining = input.tasks.filter((task) => task.status !== "completed" && task.status !== "closed");
  const nextTask = remaining[0];
  if (normalized.includes("تقدم") || normalized.includes("راجع")) {
    return { content: `أنجزت ${input.progress.completed} من ${input.progress.total} مهام، ووصل تقدّمك إلى ${input.progress.percent}٪. ${input.progress.remaining ? `بقيت ${input.progress.remaining} مهام؛ اختر واحدة فقط للخطوة التالية.` : "أكملت يومك، وهذا يستحق الاحتفاء."}` };
  }
  if (normalized.includes("رتب") || normalized.includes("تبق")) {
    const plan = remaining.slice(0, 3).map((task, index) => `${index + 1}. ${task.title}`).join("\n");
    return { content: remaining.length ? `أكيد يا ${input.participant.name.split(" ")[0]}. هذه أولوياتك ببساطة:\n${plan}\n\nابدأ بالأولى فقط.` : "يومك مكتمل بالفعل 👏 خذ دقيقة لتقدّر ما أنجزته." };
  }
  if (normalized.includes("أصغر") || normalized.includes("ابدأ")) return { content: nextTask ? `لنصغّرها جدًا: افتح مهمة «${nextTask.title}» وامنحها دقيقتين فقط.` : "لا توجد مهمة متبقية الآن؛ اختر خطوة بسيطة للعناية بنفسك." };
  if (normalized.includes("سلسل")) return { content: `سلسلتك الآن ${input.streak} يومًا 🔥 حافظ عليها بإنجاز الحد الأدنى من مهمة واحدة اليوم.` };
  if (normalized.includes("رياض")) return { content: "اجعل البداية خفيفة: ارتدِ ملابس الرياضة وابدأ بعشر دقائق فقط." };
  return { content: nextTask ? `أنا معك. أقترح أن نبدأ بـ «${nextTask.title}» ونقسّمها إلى خطوة لا تتجاوز عشر دقائق.` : "أحسنت، لا توجد مهام متبقية اليوم. هل نجهّز خطوة بسيطة للغد؟" };
}

export class MockAIAdapter implements AIAdapter {
  private readonly delayMs: number;

  constructor(delayMs = 900) {
    this.delayMs = delayMs;
  }

  async sendMessage(input: AIRequest): Promise<AIResponse> {
    await new Promise<void>((resolve) => globalThis.setTimeout(resolve, this.delayMs));
    return createMockResponse(input);
  }
}

export const mockAIAdapter: AIAdapter = new MockAIAdapter();
