import { FastifyRequest, FastifyReply } from 'fastify';
import { ListDocumentsUseCase } from '../../../application/use-cases/documents/ListDocumentsUseCase';

export class ListDocumentsController {
    constructor(private listDocumentsUseCase: ListDocumentsUseCase) {}

    async list(request: FastifyRequest, reply: FastifyReply) {
        const documents = await this.listDocumentsUseCase.execute();
        return reply.status(200).send(documents);
    }
}
