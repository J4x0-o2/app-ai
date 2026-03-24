import { AIService } from '../../services/AIService';
import { EmbeddingService } from '../../services/EmbeddingService';
import { VectorSearchService } from '../../services/VectorSearchService';
import { AIQueryRepository } from '../../../domain/repositories/AIQueryRepository';

export class AskAIQuestionUseCase {
  constructor(
    private aiService: AIService,
    private embeddingService: EmbeddingService,
    private vectorSearchService: VectorSearchService,
    private aiQueryRepository: AIQueryRepository
  ) {}

  async execute(userId: string, question: string): Promise<any> {
    // Implementation will go here
    throw new Error('Not implemented');
  }
}
