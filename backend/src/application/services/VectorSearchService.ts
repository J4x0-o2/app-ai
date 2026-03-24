export interface VectorSearchService {
  similaritySearch(vector: number[], limit: number): Promise<any[]>;
}
