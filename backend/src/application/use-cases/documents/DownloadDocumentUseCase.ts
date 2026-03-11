import { DocumentRepository } from '../../../domain/repositories/DocumentRepository';
import { FileStorageService } from '../../../infrastructure/storage/FileStorageService';
import { ApplicationError } from '../../../shared/errors/errors';
import { Document } from '../../../domain/entities/Document';

export interface DownloadDocumentResponse {
    document: Document;
    buffer: Buffer;
}

export class DownloadDocumentUseCase {
    constructor(
        private documentRepository: DocumentRepository,
        private fileStorageService: FileStorageService
    ) {}

    async execute(documentId: string): Promise<DownloadDocumentResponse> {
        const document = await this.documentRepository.findById(documentId);
        
        if (!document || !document.isActive) {
            throw new ApplicationError('Document not found or inactive', 'NOT_FOUND');
        }

        const buffer = await this.fileStorageService.get(document.storagePath);

        return {
            document,
            buffer
        };
    }
}
