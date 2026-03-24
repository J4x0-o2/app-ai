export interface VectorSearchResult {
  chunk_id: string;
  document_id: string;
  content: string;
  similarity: number;
}

export interface VectorSearchService {
  /**
   * Searches for the most similar document chunks based on a vector embedding.
   * @param embedding The query embedding vector.
   * @param topK The number of top results to return (default: 5).
   * @returns A promise that resolves to an array of search results.
   */
  search(embedding: number[], topK?: number): Promise<VectorSearchResult[]>;
}
