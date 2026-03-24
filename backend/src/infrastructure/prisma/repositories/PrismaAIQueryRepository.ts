import { PrismaClient } from '@prisma/client';
import { AIQueryRepository } from '../../../domain/repositories/AIQueryRepository';
import { AIQuery } from '../../../domain/entities/AIQuery';

export class PrismaAIQueryRepository implements AIQueryRepository {
  constructor(private prisma: PrismaClient) { }

  async save(query: AIQuery): Promise<void> {
    await this.prisma.ai_queries.create({
      data: {
        id: query.id,
        user_id: query.userId,
        question: query.question,
        response: query.response,
        model_used: query.modelUsed,
        tokens_used: query.tokensUsed,
        created_at: query.createdAt,
      },
    });
  }

  async findByUser(userId: string): Promise<AIQuery[]> {
    const queries = await this.prisma.ai_queries.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    return queries.map(q => ({
      id: q.id,
      userId: q.user_id,
      question: q.question,
      response: q.response,
      modelUsed: q.model_used,
      tokensUsed: q.tokens_used ?? 0,
      createdAt: q.created_at as Date,
    }));
  }

  async list(): Promise<AIQuery[]> {
    const queries = await this.prisma.ai_queries.findMany({
      orderBy: { created_at: 'desc' },
    });

    return queries.map(q => ({
      id: q.id,
      userId: q.user_id,
      question: q.question,
      response: q.response,
      modelUsed: q.model_used,
      tokensUsed: q.tokens_used ?? 0,
      createdAt: q.created_at as Date,
    }));
  }
}
