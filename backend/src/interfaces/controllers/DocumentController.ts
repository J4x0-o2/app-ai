import { FastifyRequest, FastifyReply } from 'fastify';
import { UploadDocument } from '../../application/useCases/UploadDocument';
import { DeleteDocument } from '../../application/useCases/DeleteDocument';
import { UploadDocumentRequest } from '../../application/dto/DocumentDTO';

export class DocumentController {
    constructor(
        private uploadDocument: UploadDocument,
        private deleteDocument: DeleteDocument
    ) { }

    async upload(request: FastifyRequest<{ Body: UploadDocumentRequest }>, reply: FastifyReply) {
        const result = await this.uploadDocument.execute(request.body);
        return reply.status(201).send(result);
    }

    async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        await this.deleteDocument.execute(request.params.id);
        return reply.status(204).send();
    }
}
