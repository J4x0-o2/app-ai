export interface VectorRepository {
  saveEmbedding(chunkId: string, vector: number[]): Promise<void>;
  similaritySearch(vector: number[], limit: number): Promise<any[]>;
}
