export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface LLMCallMetrics {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
    latencyMs: number | null;
    inputTokensEstimated: boolean;
}

export interface AIService {
    answerQuestion(context: string, question: string, history?: ChatMessage[]): Promise<string>;
    streamAnswer(context: string, question: string, history?: ChatMessage[]): AsyncGenerator<string>;
    getLastCallMetrics?(): LLMCallMetrics | null;
}
