import { apiClient, tokenStorage } from '../../../utils/apiClient';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

export interface StreamChunkEvent {
    chunk?: string;
    done?: boolean;
    conversationId?: string;
    error?: string;
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

    streamMessage: async function* (
        data: SendMessageRequest,
        signal?: AbortSignal,
    ): AsyncGenerator<StreamChunkEvent> {
        const token = tokenStorage.get();
        const response = await fetch(`${BASE_URL}/api/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(data),
            signal,
        });

        if (!response.ok || !response.body) {
            throw new Error(`Stream error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const event: StreamChunkEvent = JSON.parse(line.slice(6));
                            yield event;
                        } catch {
                            // malformed SSE line — skip
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    },

    getConversations: () =>
        apiClient.get<ConversationSummary[]>('/api/conversations'),

    getHistory: (conversationId: string, userId: string) =>
        apiClient.get<ConversationHistoryResponse>(`/api/chat/${conversationId}/history?userId=${userId}`),

    deleteConversation: (id: string) =>
        apiClient.delete<void>(`/api/conversations/${id}`),
};
