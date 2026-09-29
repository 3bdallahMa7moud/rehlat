import type { AiApiConversation, AiApiMessage, AiApiReport } from "./ai-types";

// Future backend adapter contract. No fetch call or frontend binding is active.
export interface ApiAiAdapter {
  listConversations(): Promise<AiApiConversation[]>;
  listMessages(conversationId: string): Promise<AiApiMessage[]>;
  sendMessage(conversationId: string | null, message: string): Promise<AiApiMessage>;
  deleteConversation(conversationId: string): Promise<void>;
  listReports(): Promise<AiApiReport[]>;
}
