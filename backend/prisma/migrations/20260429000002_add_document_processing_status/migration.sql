-- Track async processing state for documents uploaded via BullMQ queue.
-- pending: job enqueued, not yet started
-- processing: worker is running chunking + embeddings
-- done: ready for RAG queries
-- error: worker failed after all retries
ALTER TABLE documents
ADD COLUMN processing_status VARCHAR(20) NOT NULL DEFAULT 'pending';
