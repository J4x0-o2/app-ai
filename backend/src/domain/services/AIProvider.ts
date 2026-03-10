export interface PromptRequest {
    userId: string;
    conversationId: string;
    prompt: string;
    model: string;
    contextDocuments?: string[];
}

export interface AIResponseData {
    response: string;
    modelUsed: string;
    tokensUsed: number;
    timestamp: Date;
}

export interface AIProvider {
    sendPrompt(input: PromptRequest): Promise<AIResponseData>;
}
