-- ============================================================
-- Dashboard de métricas AI — Migración 20260513000001
-- ============================================================
-- 1. Expande ai_queries con provider, tokens desglosados y latencia
-- 2. Nueva tabla ai_cache_stats (contadores hit/miss por día y proveedor)
-- 3. Nueva tabla ai_job_history (historial persistente de jobs BullMQ)
-- ============================================================

-- 1. Ampliar ai_queries
ALTER TABLE ai_queries
  ADD COLUMN IF NOT EXISTS provider              VARCHAR(50)  NOT NULL DEFAULT 'gemini',
  ADD COLUMN IF NOT EXISTS input_tokens          INTEGER      NULL,
  ADD COLUMN IF NOT EXISTS output_tokens         INTEGER      NULL,
  ADD COLUMN IF NOT EXISTS input_tokens_estimated BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS latency_ms            INTEGER      NULL;

-- Índice para filtrar por proveedor y fecha (queries del dashboard)
CREATE INDEX IF NOT EXISTS idx_ai_queries_provider_created
  ON ai_queries (provider, created_at);

-- 2. Tabla de contadores de cache semántico por día y proveedor
CREATE TABLE IF NOT EXISTS ai_cache_stats (
  id         UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date       DATE         NOT NULL,
  provider   VARCHAR(50)  NOT NULL,
  model      VARCHAR(100) NOT NULL,
  hits       INTEGER      NOT NULL DEFAULT 0,
  misses     INTEGER      NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT uq_ai_cache_stats_date_provider_model UNIQUE (date, provider, model)
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_stats_date
  ON ai_cache_stats (date);

-- 3. Tabla de historial de jobs de procesamiento de documentos (BullMQ)
CREATE TABLE IF NOT EXISTS ai_job_history (
  id             UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id    UUID         NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  provider       VARCHAR(50)  NOT NULL DEFAULT 'gemini',
  started_at     TIMESTAMPTZ  NOT NULL,
  completed_at   TIMESTAMPTZ  NULL,
  duration_ms    INTEGER      NULL,
  status         VARCHAR(20)  NOT NULL,   -- 'done' | 'failed'
  error_message  TEXT         NULL,
  attempt_number INTEGER      NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_job_history_document_id
  ON ai_job_history (document_id);

CREATE INDEX IF NOT EXISTS idx_ai_job_history_status_created
  ON ai_job_history (status, created_at);
