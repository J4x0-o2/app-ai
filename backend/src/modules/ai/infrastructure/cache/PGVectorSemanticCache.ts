import prisma from '../../../../infrastructure/database/prismaClient';
import { ISemanticCache, CacheHit } from '../../domain/services/ISemanticCache';

// Uses pgvector + HNSW index (halfvec cast) for cosine similarity lookup.
// Same cast pattern as PGVectorSearchService — ensures the query planner uses the index.
export class PGVectorSemanticCache implements ISemanticCache {
    constructor(
        private readonly threshold: number = 0.92,
        private readonly ttlHours: number = 24
    ) {}

    async get(embedding: number[]): Promise<CacheHit | null> {
        const embeddingStr = `[${embedding.join(',')}]`;

        const rows = await prisma.$queryRaw<{ id: string; response_text: string; similarity: number }[]>`
            SELECT
                id::text,
                response_text,
                1 - (question_embedding::halfvec(3072) <=> ${embeddingStr}::halfvec(3072)) AS similarity
            FROM ai_response_cache
            WHERE expires_at > NOW()
              AND 1 - (question_embedding::halfvec(3072) <=> ${embeddingStr}::halfvec(3072)) >= ${this.threshold}
            ORDER BY question_embedding::halfvec(3072) <=> ${embeddingStr}::halfvec(3072)
            LIMIT 1;
        `;

        if (rows.length === 0) return null;

        const row = rows[0];

        // Increment hit_count asynchronously — don't block the response
        prisma.ai_response_cache
            .update({ where: { id: row.id }, data: { hit_count: { increment: 1 } } })
            .catch(err => console.error('[SemanticCache] hit_count update failed:', err));

        return { response: row.response_text, similarity: Number(row.similarity) };
    }

    async set(embedding: number[], question: string, response: string): Promise<void> {
        const embeddingStr = `[${embedding.join(',')}]`;
        const expiresAt = new Date(Date.now() + this.ttlHours * 60 * 60 * 1000);

        await prisma.$executeRaw`
            INSERT INTO ai_response_cache (question_embedding, question_text, response_text, expires_at)
            VALUES (${embeddingStr}::vector(3072), ${question}, ${response}, ${expiresAt})
        `;
    }
}
