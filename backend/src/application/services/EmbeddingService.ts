export interface EmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
}
