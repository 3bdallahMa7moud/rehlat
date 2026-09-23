import type { JourneySound } from "./sound";
import type { TaskOutcome } from "@/domain/tasks/task-domain";

export type FeedbackTone = "success" | "info" | "neutral";

export type TaskOutcomeFeedback = {
  tone: FeedbackTone;
  title: string;
  body: string;
  sound: JourneySound | null;
  celebrate: "task" | null;
};

export function getTaskOutcomeFeedback(outcome: TaskOutcome): TaskOutcomeFeedback {
  switch (outcome) {
    case "completed":
      return { tone: "success", title: "تم إنجاز المهمة", body: "تم حفظ الإنجاز والوقت الفعلي.", sound: "celebration", celebrate: "task" };
    case "partial":
      return { tone: "info", title: "تم حفظ الإنجاز الجزئي", body: "احتُسب 50% من المهمة في تقدم اليوم، مع حفظ الوقت الفعلي.", sound: null, celebrate: null };
    case "not_completed":
      return { tone: "neutral", title: "تم حفظ حالة المهمة", body: "الوقت محفوظ، ويمكنك المحاولة مرة أخرى لاحقًا.", sound: null, celebrate: null };
    case "closed":
      return { tone: "neutral", title: "تم إغلاق المهمة", body: "تم حفظ الوقت والسجل بدون احتساب إنجاز.", sound: null, celebrate: null };
  }
}

export function getTaskDetailOutcomeFeedback(outcome: Exclude<TaskOutcome, "closed">, detailTitle: string): TaskOutcomeFeedback {
  if (outcome === "completed") {
    return { tone: "success", title: "تم حفظ التفصيل", body: `${detailTitle}: تم حفظ الوقت والنتيجة.`, sound: null, celebrate: null };
  }
  if (outcome === "partial") {
    return { tone: "info", title: "تم حفظ الإنجاز الجزئي", body: `${detailTitle}: تم حفظ التقدم والوقت الفعلي.`, sound: null, celebrate: null };
  }
  return { tone: "neutral", title: "تم حفظ حالة التفصيل", body: `${detailTitle}: الوقت محفوظ ويمكنك المحاولة لاحقًا.`, sound: null, celebrate: null };
}

export function getDayCompletionFeedback() {
  return {
    tone: "success" as const,
    title: "اكتملت رحلة اليوم",
    body: "تم حفظ مهامك ووقتك لهذا اليوم.",
    sound: "celebration" as const,
    celebrate: "day" as const,
  };
}

export function toToastTone(tone: FeedbackTone): "success" | "info" {
  return tone === "success" ? "success" : "info";
}
