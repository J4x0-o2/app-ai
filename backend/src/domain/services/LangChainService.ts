export interface LangChainRequest {
    prompt: string;
    conversationHistory: Array<{ role: string; content: string }>;
    relevantDocuments: string[];
}

export interface LangChainService {
    processPrompt(request: LangChainRequest): Promise<string>;
}
