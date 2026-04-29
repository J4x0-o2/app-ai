import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { IDocumentQueue, DocumentJobPayload } from '../../domain/services/IDocumentQueue';

const QUEUE_NAME = 'document-processing';

// Switching to a different queue provider (SQS, RabbitMQ, etc.) means creating a new
// class that implements IDocumentQueue and updating the wiring in routes/index.ts.
export class BullMQDocumentQueue implements IDocumentQueue {
    private readonly queue: Queue;

    constructor(connection: IORedis) {
        this.queue = new Queue(QUEUE_NAME, {
            connection,
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
                removeOnComplete: true,
                removeOnFail: false,
            },
        });
    }

    async enqueue(payload: DocumentJobPayload): Promise<void> {
        await this.queue.add('process-document', payload);
    }

    async close(): Promise<void> {
        await this.queue.close();
    }
}
