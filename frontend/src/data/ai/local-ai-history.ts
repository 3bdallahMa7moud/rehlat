import type { AIConversation } from "../../types/models.ts";

const AI_HISTORY_KEY = "joc-ai-history-v1";
export interface LocalAiHistory { conversations: AIConversation[]; activeId: string; }

export function readLocalAiHistory(participantId: string): LocalAiHistory | null {
  try {
    const stored = window.localStorage.getItem(AI_HISTORY_KEY);
    if (!stored) return null;
    const histories = JSON.parse(stored) as Record<string, LocalAiHistory>;
    return histories[participantId]?.conversations.length ? histories[participantId] : null;
  } catch { return null; }
}

export function writeLocalAiHistory(participantId: string, history: LocalAiHistory): void {
  try {
    const stored = window.localStorage.getItem(AI_HISTORY_KEY);
    const histories = stored ? JSON.parse(stored) as Record<string, LocalAiHistory> : {};
    histories[participantId] = history;
    window.localStorage.setItem(AI_HISTORY_KEY, JSON.stringify(histories));
  } catch { /* Local chat remains usable when storage is unavailable. */ }
}
