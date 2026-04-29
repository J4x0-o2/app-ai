import { DocumentRepository } from '../../domain/repositories/DocumentRepository';
import { Document, ProcessingStatus } from '../../domain/entities/Document';
import prisma from '../database/prismaClient';

export class PrismaDocumentRepository implements DocumentRepository {
    async create(document: Document): Promise<void> {
        await prisma.documents.create({
            data: {
                id: document.id,
                name: document.name,
                type: document.type,
                size: BigInt(document.size),
                storage_path: document.storagePath,
                uploaded_by: document.uploadedBy,
                processing_status: document.processingStatus,
                is_active: document.isActive,
                created_at: document.createdAt,
                updated_at: document.updatedAt,
                deleted_at: document.deletedAt,
                deleted_by: document.deletedBy,
            },
        });
    }

    async findById(id: string): Promise<Document | null> {
        const docRec = await prisma.documents.findUnique({ where: { id } });
        if (!docRec) return null;
        return this.mapToEntity(docRec);
    }

    async findAll(): Promise<Document[]> {
        const docs = await prisma.documents.findMany({ where: { is_active: true } });
        return docs.map(docRec => this.mapToEntity(docRec));
    }

    async softDelete(id: string, userId: string): Promise<void> {
        await prisma.documents.update({
            where: { id },
            data: { is_active: false, deleted_at: new Date(), deleted_by: userId },
        });
    }

    async updateProcessingStatus(id: string, status: ProcessingStatus): Promise<void> {
        await prisma.documents.update({
            where: { id },
            data: { processing_status: status },
        });
    }

    private mapToEntity(docRec: any): Document {
        return new Document(
            docRec.id,
            docRec.name,
            docRec.type || 'unknown',
            docRec.size != null ? Number(docRec.size) : 0,
            docRec.storage_path,
            docRec.uploaded_by || '',
            (docRec.processing_status as ProcessingStatus) ?? 'pending',
            docRec.is_active ?? true,
            docRec.created_at || new Date(),
            docRec.updated_at || new Date(),
            docRec.deleted_at,
            docRec.deleted_by,
        );
    }
}
