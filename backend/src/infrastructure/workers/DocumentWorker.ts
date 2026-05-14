import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { DocumentJobPayload } from '../../domain/services/IDocumentQueue';
import { DocumentRepository } from '../../domain/repositories/DocumentRepository';
import { ProcessDocumentForAIUseCase } from '../../modules/ai/application/usecases/ProcessDocumentForAIUseCase';
import prisma from '../database/prismaClient';

const QUEUE_NAME = 'document-processing';

// concurrency=2: processes 2 documents in parallel
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
            const startedAt = new Date();
            console.log(`[DocumentWorker] Starting job ${job.id} — document ${documentId}`);

            await documentRepository.updateProcessingStatus(documentId, 'processing');

            try {
                await processDocumentUseCase.execute(documentId);
                await documentRepository.updateProcessingStatus(documentId, 'done');

                const completedAt = new Date();
                const durationMs = completedAt.getTime() - startedAt.getTime();

                prisma.ai_job_history.create({
                    data: {
                        document_id: documentId,
                        provider: 'gemini',
                        started_at: startedAt,
                        completed_at: completedAt,
                        duration_ms: durationMs,
                        status: 'done',
                        attempt_number: (job.attemptsMade ?? 0) + 1,
                    },
                }).catch(err => console.error('[DocumentWorker] Failed to save job history:', err));

                console.log(`[DocumentWorker] Done — document ${documentId} in ${durationMs}ms`);
            } catch (error) {
                await documentRepository.updateProcessingStatus(documentId, 'error');

                const completedAt = new Date();
                const durationMs = completedAt.getTime() - startedAt.getTime();
                const errorMsg = error instanceof Error ? error.message : String(error);

                prisma.ai_job_history.create({
                    data: {
                        document_id: documentId,
                        provider: 'gemini',
                        started_at: startedAt,
                        completed_at: completedAt,
                        duration_ms: durationMs,
                        status: 'failed',
                        error_message: errorMsg,
                        attempt_number: (job.attemptsMade ?? 0) + 1,
                    },
                }).catch(err => console.error('[DocumentWorker] Failed to save job history:', err));

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
