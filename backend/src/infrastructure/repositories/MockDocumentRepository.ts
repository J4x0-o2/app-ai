import { DocumentRepository } from '../../domain/repositories/DocumentRepository';
import { Document } from '../../domain/entities/Document';

export class MockDocumentRepository implements DocumentRepository {
    private documents: Map<string, Document> = new Map();

    async findById(id: string): Promise<Document | null> {
        return this.documents.get(id) || null;
    }

    async findByUserId(userId: string): Promise<Document[]> {
        return Array.from(this.documents.values()).filter(doc => doc.uploadedByUserId === userId);
    }

    async save(document: Document): Promise<void> {
        this.documents.set(document.id, document);
    }

    async delete(id: string): Promise<void> {
        this.documents.delete(id);
    }
}
