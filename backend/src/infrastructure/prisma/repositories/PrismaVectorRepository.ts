import { PrismaClient } from '@prisma/client';
import { VectorRepository } from '../../../domain/repositories/VectorRepository';

export class PrismaVectorRepository implements VectorRepository {
  constructor(private prisma: PrismaClient) {}

  async saveEmbedding(chunkId: string, vector: number[]): Promise<void> {
    const formattedVector = `[${vector.join(',')}]`;
    
    await this.prisma.$executeRaw`
      INSERT INTO document_embeddings (chunk_id, embedding)
      VALUES (${chunkId}::uuid, ${formattedVector}::vector)
    `;
  }

  async similaritySearch(vector: number[], limit: number): Promise<any[]> {
    const formattedVector = `[${vector.join(',')}]`;
    
    const results = await this.prisma.$queryRaw`
      SELECT c.id, c.document_id, c.content, c.chunk_index
      FROM document_chunks c
      JOIN document_embeddings e ON c.id = e.chunk_id
      ORDER BY e.embedding <=> ${formattedVector}::vector
      LIMIT ${limit}
    `;
    
    return results as any[];
  }
}
