import { DocumentRepository } from '../../domain/repositories/DocumentRepository';
import { Document } from '../../domain/entities/Document';
import { UploadDocumentRequest, DocumentResponse } from '../dto/DocumentDTO';
import { ApplicationError } from '../../shared/errors/errors';
import { randomUUID } from 'crypto';

export class UploadDocument {
    private readonly MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
    private readonly ALLOWED_TYPES = ['application/pdf', 'text/plain', 'application/msword'];

    constructor(private documentRepository: DocumentRepository) { }

    async execute(request: UploadDocumentRequest): Promise<DocumentResponse> {
        if (request.sizeBytes > this.MAX_SIZE_BYTES) {
            throw new ApplicationError('File exceeds max size limit', 'VALIDATION_ERROR');
        }

        if (!this.ALLOWED_TYPES.includes(request.fileType)) {
            throw new ApplicationError('Invalid file type', 'VALIDATION_ERROR');
        }

        if (!request.content || request.content.length === 0) {
            throw new ApplicationError('File is corrupted or empty', 'VALIDATION_ERROR');
        }

        const mockPath = `/mock/storage/${request.filename}`;

        const document = new Document(
            randomUUID(),
            request.filename,
            request.fileType,
            request.sizeBytes,
            request.userId,
            new Date(),
            mockPath
        );

        await this.documentRepository.save(document);

        return {
            id: document.id,
            filename: document.filename,
            fileType: document.fileType,
            sizeBytes: document.sizeBytes,
            uploadedAt: document.uploadedAt,
            urlOrPath: document.urlOrPath
        };
    }
}
