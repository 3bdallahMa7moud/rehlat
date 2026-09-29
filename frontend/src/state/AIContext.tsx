"use client";

// Future AI-only state boundary. It is intentionally not mounted in Providers.
export interface AiUiState {
  activeConversationId: string | null;
  isSending: boolean;
  error: string | null;
}
