-- Migration: Update embedding column from vector(768) to vector(3072)
-- Reason: gemini-embedding-001 produces 3072-dimensional vectors, not 768.

-- Delete any orphaned embeddings that may exist with incorrect dimensions
-- (chunks saved before the embedding insert failed)
DELETE FROM document_embeddings;

-- Also clean up orphaned chunks that have no embedding
-- (created during failed process-document calls)
DELETE FROM document_chunks
WHERE id NOT IN (SELECT chunk_id FROM document_embeddings);

-- Alter the column type
ALTER TABLE "document_embeddings"
  ALTER COLUMN "embedding" TYPE vector(3072);
