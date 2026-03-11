import { DocumentRepository } from '../../../domain/repositories/DocumentRepository';
import { ApplicationError } from '../../../shared/errors/errors';

export class DeleteDocumentUseCase {
    constructor(private documentRepository: DocumentRepository) {}

    async execute(documentId: string, userId: string): Promise<void> {
        const document = await this.documentRepository.findById(documentId);
        
        if (!document) {
            throw new ApplicationError('Document not found', 'NOT_FOUND');
        }
        
        if (!document.isActive) {
            throw new ApplicationError('Document is already deleted', 'VALIDATION_ERROR');
        }

        await this.documentRepository.softDelete(documentId, userId);
    }
}
