import { AIProvider, PromptRequest, AIResponseData } from '../../domain/services/AIProvider';

export class MockAIProvider implements AIProvider {
    async sendPrompt(input: PromptRequest): Promise<AIResponseData> {
        return {
            response: `Mocked AI Provider answer to: "${input.prompt}"`,
            modelUsed: input.model,
            tokensUsed: 42,
            timestamp: new Date()
        };
    }
}
