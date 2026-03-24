import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { VectorSearchService } from '../../../application/services/VectorSearchService';

export class PGVectorStoreService implements VectorSearchService {
  private vectorStore: PGVectorStore;

  constructor(connectionString: string, embeddings: GoogleGenerativeAIEmbeddings) {
    this.vectorStore = new PGVectorStore(embeddings, {
      postgresConnectionOptions: {
        connectionString,
      },
      tableName: 'document_embeddings',
      columns: {
        idColumnName: 'id',
        vectorColumnName: 'embedding',
        contentColumnName: 'content',
        metadataColumnName: 'metadata',
      },
    });
  }

  async similaritySearch(vector: number[], limit: number): Promise<any[]> {
    const results = await this.vectorStore.similaritySearchVectorWithScore(vector, limit);
    return results.map(([doc, score]) => ({
      document: doc,
      score,
    }));
  }
}
