import prisma from "../../../../infrastructure/database/prismaClient";
import { VectorSearchResult, VectorSearchService } from "../../domain/services/VectorSearchService";

export class PGVectorSearchService implements VectorSearchService {
  async search(embedding: number[], topK: number = 5): Promise<VectorSearchResult[]> {
    try {
      // Format the embedding array for pgvector
      const embeddingString = `[${embedding.join(",")}]`;

      // Cast both sides to halfvec(3072) so PostgreSQL uses the HNSW index.
      // The index is defined as: USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops)
      // Without this cast the planner falls back to O(n) sequential scan.
      const results = await prisma.$queryRaw`
        SELECT
          de.chunk_id::text,
          dc.document_id::text,
          dc.content,
          1 - (de.embedding::halfvec(3072) <=> ${embeddingString}::halfvec(3072)) as similarity
        FROM document_embeddings de
        JOIN document_chunks dc ON de.chunk_id = dc.id
        ORDER BY de.embedding::halfvec(3072) <=> ${embeddingString}::halfvec(3072)
        LIMIT ${topK};
      `;

      // Cast the raw results to our domain interface
      return (results as any[]).map((row) => ({
        chunk_id: row.chunk_id,
        document_id: row.document_id,
        content: row.content,
        similarity: row.similarity,
      }));
    } catch (error) {
      console.error("Error performing vector search:", error);
      throw new Error(`Failed to perform vector search: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
