export interface AIRequest { message: string; }
export interface AIAdapter { sendMessage(input: AIRequest): Promise<void>; }

export class MockAIAdapter implements AIAdapter {
  constructor(private readonly delayMs = 900) {}

  sendMessage(input: AIRequest): Promise<void> {
    void input;
    return new Promise((resolve) => window.setTimeout(resolve, this.delayMs));
  }
}

export const mockAIAdapter: AIAdapter = new MockAIAdapter();
