import { DocumentRepository } from '../../domain/repositories/DocumentRepository';
import { ApplicationError } from '../../shared/errors/errors';

export class DeleteDocument {
    constructor(private documentRepository: DocumentRepository) { }

    async execute(documentId: string): Promise<void> {
        const document = await this.documentRepository.findById(documentId);
        if (!document) {
            throw new ApplicationError('Document not found', 'NOT_FOUND');
        }

        await this.documentRepository.delete(documentId);
    }
}
