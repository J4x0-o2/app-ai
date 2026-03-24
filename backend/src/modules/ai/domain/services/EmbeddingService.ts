export interface EmbeddingService {
  /**
   * Generates a vector embedding for the given text.
   * @param text The text to generate an embedding for.
   * @returns A float array representing the embedding.
   */
  generateEmbedding(text: string): Promise<number[]>;
}
