import { apiClient } from '../../utils/apiClient';

export interface OverviewData {
  queries: { allTime: number; last7d: number };
  tokens: { allTime: number; last7d: number };
  cache: { hitRate7d: number; hits7d: number; misses7d: number };
  queue: { doneJobs7d: number; failedJobs7d: number; avgDurationMs7d: number };
  activeUsers7d: number;
}

export interface LLMUsageRow {
  day: string;
  provider: string;
  model: string;
  totalQueries: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  avgLatencyMs: number | null;
}

export interface CacheStatsData {
  dailyStats: Array<{
    date: string;
    provider: string;
    model: string;
    hits: number;
    misses: number;
    hitRate: number;
  }>;
  overallHitRate: number;
  totalHits: number;
  totalMisses: number;
}

export interface QueueStatsData {
  dailyStats: Array<{
    day: string;
    totalJobs: number;
    doneJobs: number;
    failedJobs: number;
    avgDurationMs: number | null;
  }>;
  recentFailures: Array<{
    id: string;
    documentName: string;
    errorMessage: string | null;
    attemptNumber: number;
    startedAt: string;
  }>;
}

export const dashboardService = {
  getOverview: () => apiClient.get<OverviewData>('/api/admin/dashboard/overview'),
  getLLMUsage: () => apiClient.get<LLMUsageRow[]>('/api/admin/dashboard/llm-usage'),
  getCacheStats: () => apiClient.get<CacheStatsData>('/api/admin/dashboard/cache'),
  getQueueStats: () => apiClient.get<QueueStatsData>('/api/admin/dashboard/queue'),
};
