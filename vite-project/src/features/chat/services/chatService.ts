import { apiClient } from '../../../utils/apiClient';

interface SendMessageRequest {
    userId: string;
    prompt: string;
    model: string;
    conversationId?: string;
}

interface SendMessageResponse {
    conversationId: string;
    response: {
        id: string;
        content: string;
        modelUsed: string;
    };
}

export interface ConversationSummary {
    id: string;
    title: string;
    createdAt: string;
}

interface ConversationHistoryResponse {
    conversationId: string;
    startedAt: string;
    prompts: Array<{
        id: string;
        content: string;
        response?: string;
        sentAt: string;
    }>;
}

export const chatService = {
    sendMessage: (data: SendMessageRequest) =>
        apiClient.post<SendMessageResponse>('/api/chat', data),

    getConversations: () =>
        apiClient.get<ConversationSummary[]>('/api/conversations'),

    getHistory: (conversationId: string, userId: string) =>
        apiClient.get<ConversationHistoryResponse>(`/api/chat/${conversationId}/history?userId=${userId}`),

    deleteConversation: (id: string) =>
        apiClient.delete<void>(`/api/conversations/${id}`),
};
