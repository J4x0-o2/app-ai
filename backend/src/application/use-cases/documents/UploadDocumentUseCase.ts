import { DocumentRepository } from '../../../domain/repositories/DocumentRepository';
import { IDocumentQueue } from '../../../domain/services/IDocumentQueue';
import { FileStorageService } from '../../../infrastructure/storage/FileStorageService';
import { Document } from '../../../domain/entities/Document';
import { ApplicationError } from '../../../shared/errors/errors';
import { v4 as uuidv4 } from 'uuid';

export interface UploadDocumentRequest {
    filename: string;
    fileType: string;
    sizeBytes: number;
    userId: string;
    buffer: Buffer;
}

export class UploadDocumentUseCase {
    private readonly MAX_SIZE_BYTES = 10 * 1024 * 1024;
    private readonly ALLOWED_TYPES = ['application/pdf'];

    constructor(
        private documentRepository: DocumentRepository,
        private fileStorageService: FileStorageService,
        private documentQueue: IDocumentQueue,
    ) { }

    async execute(request: UploadDocumentRequest): Promise<Document> {
        if (request.sizeBytes > this.MAX_SIZE_BYTES) {
            throw new ApplicationError('File exceeds max size limit of 10MB', 'VALIDATION_ERROR');
        }
        if (!this.ALLOWED_TYPES.includes(request.fileType)) {
            throw new ApplicationError(`Invalid file type: ${request.fileType}. Permitted: pdf`, 'VALIDATION_ERROR');
        }
        if (!request.buffer || request.buffer.length === 0) {
            throw new ApplicationError('File is empty', 'VALIDATION_ERROR');
        }

        const uniqueFilename = `${uuidv4()}-${request.filename}`;
        const storagePath = await this.fileStorageService.save(uniqueFilename, request.buffer);

        const document = new Document(
            uuidv4(),
            request.filename,
            request.fileType,
            request.sizeBytes,
            storagePath,
            request.userId,
            'pending',
        );

        await this.documentRepository.create(document);

        // Enqueue async processing — returns immediately.
        // The worker handles chunking + embeddings and updates processing_status.
        await this.documentQueue.enqueue({ documentId: document.id, storagePath });

        return document;
    }
}
