import { FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../../../infrastructure/database/prismaClient';

function n(value: unknown): number {
  if (typeof value === 'bigint') return Number(value);
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function sevenDaysAgo(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 6);
  return d;
}

export class AdminDashboardController {
  async overview(_req: FastifyRequest, reply: FastifyReply) {
    const since = sevenDaysAgo();

    const [
      totalQueriesAllTime,
      totalQueries7d,
      tokensAllTime,
      tokens7d,
      cacheStats7d,
      queueStats7d,
      activeUsers7d,
    ] = await Promise.all([
      prisma.ai_queries.count(),
      prisma.ai_queries.count({ where: { created_at: { gte: since } } }),
      prisma.ai_queries.aggregate({ _sum: { tokens_used: true } }),
      prisma.ai_queries.aggregate({ _sum: { tokens_used: true }, where: { created_at: { gte: since } } }),
      prisma.ai_cache_stats.aggregate({
        _sum: { hits: true, misses: true },
        where: { date: { gte: since } },
      }),
      prisma.ai_job_history.groupBy({
        by: ['status'],
        _count: { id: true },
        _avg: { duration_ms: true },
        where: { started_at: { gte: since } },
      }),
      prisma.ai_queries.findMany({
        select: { user_id: true },
        where: { created_at: { gte: since } },
        distinct: ['user_id'],
      }),
    ]);

    const hits7d = n(cacheStats7d._sum.hits);
    const misses7d = n(cacheStats7d._sum.misses);
    const total7d = hits7d + misses7d;
    const hitRate7d = total7d > 0 ? Math.round((hits7d / total7d) * 1000) / 10 : 0;

    const doneStats = queueStats7d.find(s => s.status === 'done');
    const failedStats = queueStats7d.find(s => s.status === 'failed');

    return reply.send({
      queries: {
        allTime: totalQueriesAllTime,
        last7d: totalQueries7d,
      },
      tokens: {
        allTime: n(tokensAllTime._sum.tokens_used),
        last7d: n(tokens7d._sum.tokens_used),
      },
      cache: {
        hitRate7d,
        hits7d,
        misses7d,
      },
      queue: {
        doneJobs7d: n(doneStats?._count.id),
        failedJobs7d: n(failedStats?._count.id),
        avgDurationMs7d: Math.round(n(doneStats?._avg.duration_ms)),
      },
      activeUsers7d: activeUsers7d.length,
    });
  }

  async llmUsage(_req: FastifyRequest, reply: FastifyReply) {
    const rows = await prisma.$queryRaw<Array<{
      day: Date;
      provider: string;
      model: string;
      total_queries: bigint;
      total_input_tokens: bigint;
      total_output_tokens: bigint;
      total_tokens: bigint;
      avg_latency_ms: number | null;
    }>>`
      SELECT
        DATE_TRUNC('day', created_at AT TIME ZONE 'UTC') AS day,
        provider,
        model_used                                        AS model,
        COUNT(*)                                          AS total_queries,
        COALESCE(SUM(input_tokens),  0)                  AS total_input_tokens,
        COALESCE(SUM(output_tokens), 0)                  AS total_output_tokens,
        COALESCE(SUM(tokens_used),   0)                  AS total_tokens,
        AVG(latency_ms)                                   AS avg_latency_ms
      FROM ai_queries
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY 1, 2, 3
      ORDER BY 1 ASC
    `;

    return reply.send(rows.map(r => ({
      day: r.day.toISOString().split('T')[0],
      provider: r.provider,
      model: r.model,
      totalQueries: n(r.total_queries),
      totalInputTokens: n(r.total_input_tokens),
      totalOutputTokens: n(r.total_output_tokens),
      totalTokens: n(r.total_tokens),
      avgLatencyMs: r.avg_latency_ms !== null ? Math.round(Number(r.avg_latency_ms)) : null,
    })));
  }

  async cacheStats(_req: FastifyRequest, reply: FastifyReply) {
    const since = sevenDaysAgo();

    const rows = await prisma.ai_cache_stats.findMany({
      where: { date: { gte: since } },
      orderBy: { date: 'asc' },
    });

    const dailyStats = rows.map(r => {
      const total = r.hits + r.misses;
      return {
        date: r.date.toISOString().split('T')[0],
        provider: r.provider,
        model: r.model,
        hits: r.hits,
        misses: r.misses,
        hitRate: total > 0 ? Math.round((r.hits / total) * 1000) / 10 : 0,
      };
    });

    const totalHits = rows.reduce((s, r) => s + r.hits, 0);
    const totalMisses = rows.reduce((s, r) => s + r.misses, 0);
    const grandTotal = totalHits + totalMisses;

    return reply.send({
      dailyStats,
      overallHitRate: grandTotal > 0 ? Math.round((totalHits / grandTotal) * 1000) / 10 : 0,
      totalHits,
      totalMisses,
    });
  }

  async queueStats(_req: FastifyRequest, reply: FastifyReply) {
    const dailyRows = await prisma.$queryRaw<Array<{
      day: Date;
      total_jobs: bigint;
      done_jobs: bigint;
      failed_jobs: bigint;
      avg_duration_ms: number | null;
    }>>`
      SELECT
        DATE_TRUNC('day', started_at AT TIME ZONE 'UTC') AS day,
        COUNT(*)                                          AS total_jobs,
        COUNT(*) FILTER (WHERE status = 'done')           AS done_jobs,
        COUNT(*) FILTER (WHERE status = 'failed')         AS failed_jobs,
        AVG(duration_ms) FILTER (WHERE status = 'done')  AS avg_duration_ms
      FROM ai_job_history
      WHERE started_at >= NOW() - INTERVAL '7 days'
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    const recentFailures = await prisma.$queryRaw<Array<{
      id: string;
      document_name: string;
      error_message: string | null;
      attempt_number: number;
      started_at: Date;
    }>>`
      SELECT
        j.id,
        d.name  AS document_name,
        j.error_message,
        j.attempt_number,
        j.started_at
      FROM ai_job_history j
      JOIN documents d ON j.document_id = d.id
      WHERE j.status = 'failed'
        AND j.started_at >= NOW() - INTERVAL '7 days'
      ORDER BY j.started_at DESC
      LIMIT 20
    `;

    return reply.send({
      dailyStats: dailyRows.map(r => ({
        day: r.day.toISOString().split('T')[0],
        totalJobs: n(r.total_jobs),
        doneJobs: n(r.done_jobs),
        failedJobs: n(r.failed_jobs),
        avgDurationMs: r.avg_duration_ms !== null ? Math.round(Number(r.avg_duration_ms)) : null,
      })),
      recentFailures: recentFailures.map(f => ({
        id: f.id,
        documentName: f.document_name,
        errorMessage: f.error_message,
        attemptNumber: f.attempt_number,
        startedAt: f.started_at.toISOString(),
      })),
    });
  }
}
