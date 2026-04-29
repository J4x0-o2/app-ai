-- CreateTable
CREATE TABLE "ai_response_cache" (
    "id"                 UUID         NOT NULL DEFAULT gen_random_uuid(),
    "question_embedding" vector(3072)  NOT NULL,
    "question_text"      TEXT         NOT NULL,
    "response_text"      TEXT         NOT NULL,
    "created_at"         TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "expires_at"         TIMESTAMPTZ(6) NOT NULL,
    "hit_count"          INTEGER      NOT NULL DEFAULT 0,

    CONSTRAINT "ai_response_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: fast expiry scan for nightly cleanup
CREATE INDEX "idx_ai_response_cache_expires_at"
    ON "ai_response_cache" ("expires_at");

-- CreateIndex: HNSW for cosine similarity search (halfvec cast — same pattern as document_embeddings)
-- pgvector HNSW max 2000 dims for vector; halfvec supports up to 4000 dims.
CREATE INDEX "idx_ai_response_cache_embedding"
    ON "ai_response_cache"
    USING hnsw ((question_embedding::halfvec(3072)) halfvec_cosine_ops)
    WITH (m = 16, ef_construction = 64);
