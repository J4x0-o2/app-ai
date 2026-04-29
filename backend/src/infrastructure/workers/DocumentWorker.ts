import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { DocumentJobPayload } from '../../domain/services/IDocumentQueue';
import { DocumentRepository } from '../../domain/repositories/DocumentRepository';
import { ProcessDocumentForAIUseCase } from '../../modules/ai/application/usecases/ProcessDocumentForAIUseCase';

const QUEUE_NAME = 'document-processing';

// concurrency=2: processes 2 documents in parallel. Increase when the server has
// more CPU/memory headroom or when document volume grows.
const CONCURRENCY = 2;

export function createDocumentWorker(
    processDocumentUseCase: ProcessDocumentForAIUseCase,
    documentRepository: DocumentRepository,
    connection: IORedis,
): Worker {
    const worker = new Worker<DocumentJobPayload>(
        QUEUE_NAME,
        async (job) => {
            const { documentId } = job.data;
            console.log(`[DocumentWorker] Starting job ${job.id} — document ${documentId}`);

            await documentRepository.updateProcessingStatus(documentId, 'processing');

            try {
                await processDocumentUseCase.execute(documentId);
                await documentRepository.updateProcessingStatus(documentId, 'done');
                console.log(`[DocumentWorker] Done — document ${documentId}`);
            } catch (error) {
                await documentRepository.updateProcessingStatus(documentId, 'error');
                // Re-throw so BullMQ registers the failure and applies retry/backoff.
                throw error;
            }
        },
        { connection, concurrency: CONCURRENCY },
    );

    worker.on('failed', (job, error) => {
        console.error(`[DocumentWorker] Job ${job?.id} failed after all retries:`, error.message);
    });

    return worker;
}
