import { FastifyRequest, FastifyReply } from 'fastify';
import { DeleteDocumentUseCase } from '../../../application/use-cases/documents/DeleteDocumentUseCase';

export class DeleteDocumentController {
    constructor(private deleteDocumentUseCase: DeleteDocumentUseCase) {}

    async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        const userId = (request.user as any).userId;
        const documentId = request.params.id;
        
        await this.deleteDocumentUseCase.execute(documentId, userId);
        
        return reply.status(204).send();
    }
}
