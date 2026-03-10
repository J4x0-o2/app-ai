import { AIResponse } from '../../domain/entities/AIResponse';

export interface SendPromptRequest {
    userId: string;
    conversationId?: string;
    prompt: string;
    model: string;
    documentIds?: string[];
}

export interface SendPromptResponse {
    conversationId: string;
    response: AIResponse;
}

export interface ConversationHistoryResponse {
    conversationId: string;
    startedAt: Date;
    prompts: Array<{
        id: string;
        content: string;
        response?: string;
        sentAt: Date;
    }>;
}
