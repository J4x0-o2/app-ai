import { Document, ProcessingStatus } from '../entities/Document';

export interface DocumentRepository {
    create(document: Document): Promise<void>;
    findById(id: string): Promise<Document | null>;
    findAll(): Promise<Document[]>;
    softDelete(id: string, userId: string): Promise<void>;
    updateProcessingStatus(id: string, status: ProcessingStatus): Promise<void>;
}
