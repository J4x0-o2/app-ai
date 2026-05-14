import React, { useEffect, useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { dashboardService } from '../features/admin/dashboardService';
import type { OverviewData, LLMUsageRow, CacheStatsData, QueueStatsData } from '../features/admin/dashboardService';
import styles from './AdminDashboardPage.module.css';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtMs(ms: number): string {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`;
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)}s`;
  return `${ms}ms`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es', { month: 'short', day: 'numeric' });
}

// ── Overview cards ──────────────────────────────────────────────────────────
interface CardProps { label: string; value: string; sub?: string }
const StatCard: React.FC<CardProps> = ({ label, value, sub }) => (
  <div className={styles.card}>
    <span className={styles.cardLabel}>{label}</span>
    <span className={styles.cardValue}>{value}</span>
    {sub && <span className={styles.cardSub}>{sub}</span>}
  </div>
);

// ── LLM Usage chart: aggregate rows by day ──────────────────────────────────
function aggregateByDay(rows: LLMUsageRow[]) {
  const map = new Map<string, { day: string; queries: number; tokens: number; latency: number[]; }>();
  for (const r of rows) {
    const key = r.day;
    const existing = map.get(key) ?? { day: key, queries: 0, tokens: 0, latency: [] };
    existing.queries += r.totalQueries;
    existing.tokens += r.totalTokens;
    if (r.avgLatencyMs !== null) existing.latency.push(r.avgLatencyMs);
    map.set(key, existing);
  }
  return Array.from(map.values()).map(d => ({
    day: fmtDate(d.day),
    Consultas: d.queries,
    Tokens: d.tokens,
    'Latencia (ms)': d.latency.length > 0 ? Math.round(d.latency.reduce((a, b) => a + b) / d.latency.length) : null,
  }));
}

// ── Cache chart ─────────────────────────────────────────────────────────────
function buildCacheChartData(stats: CacheStatsData) {
  const map = new Map<string, { date: string; Hits: number; Misses: number }>();
  for (const r of stats.dailyStats) {
    const existing = map.get(r.date) ?? { date: r.date, Hits: 0, Misses: 0 };
    existing.Hits += r.hits;
    existing.Misses += r.misses;
    map.set(r.date, existing);
  }
  return Array.from(map.values()).map(d => ({ ...d, date: fmtDate(d.date) }));
}

// ── Queue chart ─────────────────────────────────────────────────────────────
function buildQueueChartData(stats: QueueStatsData) {
  return stats.dailyStats.map(d => ({
    day: fmtDate(d.day),
    Completados: d.doneJobs,
    Fallidos: d.failedJobs,
    'Duración media (ms)': d.avgDurationMs,
  }));
}

// ── Main page ───────────────────────────────────────────────────────────────
export const AdminDashboardPage: React.FC = () => {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [llmUsage, setLLMUsage] = useState<LLMUsageRow[]>([]);
  const [cacheStats, setCacheStats] = useState<CacheStatsData | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, lu, cs, qs] = await Promise.all([
        dashboardService.getOverview(),
        dashboardService.getLLMUsage(),
        dashboardService.getCacheStats(),
        dashboardService.getQueueStats(),
      ]);
      setOverview(ov);
      setLLMUsage(lu);
      setCacheStats(cs);
      setQueueStats(qs);
    } catch (err) {
      console.error('[Dashboard] Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.toolbar}>
          <div>
            <div className={styles.pageTitle}>Dashboard IA</div>
            <div className={styles.subtitle}>Últimos 7 días</div>
          </div>
        </div>
        <div className={styles.loadingWrap}>Cargando métricas...</div>
      </div>
    );
  }

  const llmChartData = aggregateByDay(llmUsage);
  const cacheChartData = cacheStats ? buildCacheChartData(cacheStats) : [];
  const queueChartData = queueStats ? buildQueueChartData(queueStats) : [];

  return (
    <div className={styles.page}>
      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div>
          <div className={styles.pageTitle}>Dashboard IA</div>
          <div className={styles.subtitle}>Métricas de los últimos 7 días</div>
        </div>
        <button onClick={loadAll} style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.35rem 0.75rem', cursor: 'pointer' }}>
          Actualizar
        </button>
      </div>

      <div className={styles.content}>
        {/* ── Overview cards ── */}
        {overview && (
          <div className={styles.cardsRow}>
            <StatCard label="Consultas (7d)" value={fmt(overview.queries.last7d)} sub={`Total: ${fmt(overview.queries.allTime)}`} />
            <StatCard label="Tokens usados (7d)" value={fmt(overview.tokens.last7d)} sub={`Total: ${fmt(overview.tokens.allTime)}`} />
            <StatCard label="Hit rate caché (7d)" value={`${overview.cache.hitRate7d}%`} sub={`${overview.cache.hits7d} hits / ${overview.cache.misses7d} misses`} />
            <StatCard label="Usuarios activos (7d)" value={String(overview.activeUsers7d)} />
            <StatCard label="Jobs completados (7d)" value={fmt(overview.queue.doneJobs7d)} sub={fmtMs(overview.queue.avgDurationMs7d) + ' promedio'} />
            <StatCard label="Jobs fallidos (7d)" value={String(overview.queue.failedJobs7d)} />
          </div>
        )}

        {/* ── LLM Usage charts ── */}
        <div className={styles.chartsRow}>
          <div className={styles.panel}>
            <div className={styles.panelTitle}>Consultas por día</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={llmChartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="Consultas" fill="#1f3044" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelTitle}>Tokens por día</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={llmChartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmt(Number(v))} />
                <Tooltip formatter={(v: unknown) => fmt(Number(v))} />
                <Bar dataKey="Tokens" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.chartsRow}>
          <div className={styles.panel}>
            <div className={styles.panelTitle}>Latencia del LLM (ms, promedio diario)</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={llmChartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: unknown) => `${Number(v)}ms`} />
                <Line type="monotone" dataKey="Latencia (ms)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelTitle}>Caché semántico — Hits vs Misses</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cacheChartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Hits" fill="#10b981" radius={[3, 3, 0, 0]} stackId="a" />
                <Bar dataKey="Misses" fill="#e5e7eb" radius={[3, 3, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Queue chart ── */}
        <div className={styles.chartsRow}>
          <div className={styles.panel}>
            <div className={styles.panelTitle}>Jobs de procesamiento por día</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={queueChartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Completados" fill="#10b981" radius={[3, 3, 0, 0]} stackId="a" />
                <Bar dataKey="Fallidos" fill="#ef4444" radius={[3, 3, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelTitle}>Tiempo de procesamiento promedio (ms)</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={queueChartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmtMs(Number(v))} />
                <Tooltip formatter={(v: unknown) => fmtMs(Number(v))} />
                <Line type="monotone" dataKey="Duración media (ms)" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Recent failures table ── */}
        {queueStats && (
          <div className={styles.panel}>
            <div className={styles.panelTitle}>Jobs fallidos recientes (7d)</div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Intento</th>
                  <th>Error</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {queueStats.recentFailures.length === 0 ? (
                  <tr className={styles.emptyRow}>
                    <td colSpan={5}>Sin jobs fallidos en los últimos 7 días</td>
                  </tr>
                ) : queueStats.recentFailures.map(f => (
                  <tr key={f.id}>
                    <td>{f.documentName}</td>
                    <td>{f.attemptNumber}</td>
                    <td><span className={styles.errorMsg}>{f.errorMessage ?? '—'}</span></td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{new Date(f.startedAt).toLocaleString('es')}</td>
                    <td><span className={`${styles.badge} ${styles.badgeFailed}`}>FALLIDO</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
