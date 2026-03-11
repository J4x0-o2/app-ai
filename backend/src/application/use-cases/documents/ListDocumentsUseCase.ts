import { DocumentRepository } from '../../../domain/repositories/DocumentRepository';
import { Document } from '../../../domain/entities/Document';

export class ListDocumentsUseCase {
    constructor(private documentRepository: DocumentRepository) {}

    async execute(): Promise<Document[]> {
        return await this.documentRepository.findAll();
    }
}
