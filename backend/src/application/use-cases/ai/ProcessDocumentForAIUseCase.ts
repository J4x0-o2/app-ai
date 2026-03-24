import { EmbeddingService } from '../../services/EmbeddingService';
import { VectorRepository } from '../../../domain/repositories/VectorRepository';

export class ProcessDocumentForAIUseCase {
  constructor(
    private embeddingService: EmbeddingService,
    private vectorRepository: VectorRepository
  ) {}

  async execute(documentId: string): Promise<void> {
    // Implementation will go here
    throw new Error('Not implemented');
  }
}
