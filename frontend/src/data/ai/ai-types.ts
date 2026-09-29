// Planned HTTP contracts for the site assistant. The mock UI is still active.
export interface AiApiMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface AiApiConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiApiReport {
  id: string;
  period: "daily" | "weekly" | "monthly" | "full";
  status: "pending" | "completed" | "failed";
  content?: string;
  createdAt: string;
}
