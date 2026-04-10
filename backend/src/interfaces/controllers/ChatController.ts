import { FastifyRequest, FastifyReply } from 'fastify';
import { SendPromptToAI } from '../../application/use-cases/chat/SendPromptToAI';
import { GetConversationHistory } from '../../application/use-cases/chat/GetConversationHistory';
import { ListConversationsUseCase } from '../../application/use-cases/chat/ListConversationsUseCase';
import { DeleteConversationUseCase } from '../../application/use-cases/chat/DeleteConversationUseCase';
import { SendPromptRequest } from '../../application/dto/ChatDTO';
import { ApplicationError } from '../../shared/errors/errors';

export class ChatController {
    constructor(
        private sendPromptToAI: SendPromptToAI,
        private getConversationHistory: GetConversationHistory,
        private listConversations: ListConversationsUseCase,
        private deleteConversation: DeleteConversationUseCase
    ) { }

    async sendPrompt(request: FastifyRequest<{ Body: SendPromptRequest }>, reply: FastifyReply) {
        const result = await this.sendPromptToAI.execute(request.body);
        return reply.status(200).send(result);
    }

    async getHistory(request: FastifyRequest<{ Params: { conversationId: string }, Querystring: { userId: string } }>, reply: FastifyReply) {
        const result = await this.getConversationHistory.execute(request.params.conversationId, request.query.userId);
        return reply.status(200).send(result);
    }

    async list(request: FastifyRequest, reply: FastifyReply) {
        const userId = request.user!.userId;
        const result = await this.listConversations.execute(userId);
        return reply.status(200).send(result);
    }

    async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        const userId = request.user!.userId;
        try {
            await this.deleteConversation.execute(request.params.id, userId);
            return reply.status(204).send();
        } catch (err) {
            if (err instanceof ApplicationError) {
                const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'UNAUTHORIZED' ? 403 : 400;
                return reply.status(status).send({ error: err.message });
            }
            throw err;
        }
    }
}
