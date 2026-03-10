import { LangChainService, LangChainRequest } from '../../domain/services/LangChainService';

export class MockLangChainService implements LangChainService {
    async processPrompt(request: LangChainRequest): Promise<string> {
        return `Mocked LangChain answer to: "${request.prompt}". Context size: ${request.relevantDocuments.length} docs, ${request.conversationHistory.length} history items.`;
    }
}
