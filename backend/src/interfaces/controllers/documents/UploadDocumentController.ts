import { FastifyRequest, FastifyReply } from 'fastify';
import { UploadDocumentUseCase } from '../../../application/use-cases/documents/UploadDocumentUseCase';

export class UploadDocumentController {
    constructor(private uploadDocumentUseCase: UploadDocumentUseCase) {}

    async upload(request: FastifyRequest, reply: FastifyReply) {
        const data = await request.file();
        
        if (!data) {
            return reply.status(400).send({ error: 'No file uploaded' });
        }

        const buffer = await data.toBuffer();
        
        const fileType = data.mimetype;
        const sizeBytes = buffer.length;
        const filename = data.filename;
        const userId = (request.user as any).userId;

        const result = await this.uploadDocumentUseCase.execute({
            filename,
            fileType,
            sizeBytes,
            userId,
            buffer
        });

        return reply.status(201).send(result);
    }
}
