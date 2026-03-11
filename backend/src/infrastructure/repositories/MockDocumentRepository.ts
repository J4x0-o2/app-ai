import { DocumentRepository } from '../../domain/repositories/DocumentRepository';
import { Document } from '../../domain/entities/Document';

export class MockDocumentRepository implements DocumentRepository {
    private documents: Map<string, Document> = new Map();

    async create(document: Document): Promise<void> {
        this.documents.set(document.id, document);
    }

    async findById(id: string): Promise<Document | null> {
        return this.documents.get(id) || null;
    }

    async findAll(): Promise<Document[]> {
        return Array.from(this.documents.values()).filter(doc => doc.isActive);
    }

    async softDelete(id: string, userId: string): Promise<void> {
        const doc = this.documents.get(id);
        if (doc) {
            doc.isActive = false;
            doc.deletedAt = new Date();
            doc.deletedBy = userId;
        }
    }
}
