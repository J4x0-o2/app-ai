import { FastifyRequest, FastifyReply } from 'fastify';
import { DocumentRepository } from '../../../domain/repositories/DocumentRepository';

export class GetDocumentStatusController {
    constructor(private documentRepository: DocumentRepository) {}

    async getStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        const doc = await this.documentRepository.findById(request.params.id);
        if (!doc) return reply.status(404).send({ error: 'Document not found' });
        return reply.send({ id: doc.id, status: doc.processingStatus });
    }
}
