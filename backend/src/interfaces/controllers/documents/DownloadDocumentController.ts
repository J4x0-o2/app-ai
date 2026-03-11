import { FastifyRequest, FastifyReply } from 'fastify';
import { DownloadDocumentUseCase } from '../../../application/use-cases/documents/DownloadDocumentUseCase';

export class DownloadDocumentController {
    constructor(private downloadDocumentUseCase: DownloadDocumentUseCase) {}

    async download(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        const documentId = request.params.id;
        
        const { document, buffer } = await this.downloadDocumentUseCase.execute(documentId);

        reply.header('Content-Disposition', `attachment; filename="${document.name}"`);
        reply.header('Content-Type', document.type);
        
        return reply.status(200).send(buffer);
    }
}
