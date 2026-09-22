import type { AIMessage } from "@/types/models";

export const initialAiMessages: AIMessage[] = [
  { id: "ai-1", role: "assistant", content: "أهلًا يا رازي، يومك ماشي بشكل جميل. تحب نرتب المهمة التالية؟", createdAt: "2026-09-22T09:55:00.000Z" },
];

export const aiSuggestions = ["رتّب لي ما تبقّى من اليوم", "ساعدني أبدأ بأصغر خطوة", "كيف أحافظ على سلسلتي؟", "راجع تقدّمي اليوم"];
