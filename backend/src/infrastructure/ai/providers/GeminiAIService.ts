import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { AIService } from '../../../application/services/AIService';

export class GeminiAIService implements AIService {
  private model: ChatGoogleGenerativeAI;

  constructor(apiKey: string) {
    this.model = new ChatGoogleGenerativeAI({
      apiKey,
      model: 'gemini-1.5-flash',
      maxOutputTokens: 2048,
    });
  }

  async generateResponse(prompt: string): Promise<string> {
    const response = await this.model.invoke(prompt);
    return response.content.toString();
  }
}
