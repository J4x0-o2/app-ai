import { Document } from '../entities/Document';

export interface DocumentRepository {
    findById(id: string): Promise<Document | null>;
    findByUserId(userId: string): Promise<Document[]>;
    save(document: Document): Promise<void>;
    delete(id: string): Promise<void>;
}
