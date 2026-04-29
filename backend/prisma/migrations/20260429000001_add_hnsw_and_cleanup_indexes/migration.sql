-- HNSW vector index on document_embeddings using halfvec cast.
-- pgvector HNSW supports max 2000 dims for vector; halfvec supports up to 4000 dims.
-- Our embeddings are 3072 dims (gemini-embedding-001), so we cast to halfvec(3072) at index time.
-- FP16 precision loss is < 1% recall degradation — negligible for semantic search.
-- m=16: connections per node (recall vs memory trade-off, 16 is industry standard).
-- ef_construction=64: candidates evaluated at build time (higher = better index quality).
CREATE INDEX IF NOT EXISTS idx_document_embeddings_hnsw
ON document_embeddings
USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Indexes for refresh_tokens cleanup job
-- Without these, the nightly DELETE scans the full table.
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
ON refresh_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_revoked
ON refresh_tokens(user_id, revoked_at);
