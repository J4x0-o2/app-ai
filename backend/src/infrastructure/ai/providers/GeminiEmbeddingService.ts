import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { EmbeddingService } from '../../../application/services/EmbeddingService';

export class GeminiEmbeddingService implements EmbeddingService {
  private embeddings: GoogleGenerativeAIEmbeddings;

  constructor(apiKey: string) {
    this.embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey,
      model: 'text-embedding-004',
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const result = await this.embeddings.embedQuery(text);
    return result;
  }
}
