import { DocumentRepository } from '../../../domain/repositories/DocumentRepository';
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
    private readonly MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit
    private readonly ALLOWED_TYPES = [
        'application/pdf' // pdf
    ];

    constructor(
        private documentRepository: DocumentRepository,
        private fileStorageService: FileStorageService
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

        // Block 4 & 5: Save file via FileStorageService
        const storagePath = await this.fileStorageService.save(uniqueFilename, request.buffer);

        // Map to entity
        const document = new Document(
            uuidv4(),
            request.filename,
            request.fileType,
            request.sizeBytes,
            storagePath,
            request.userId
        );

        // Block 3 & 5: Save metadata in DB
        await this.documentRepository.create(document);

        return document;
    }
}
