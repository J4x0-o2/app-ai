import { FastifyRequest, FastifyReply } from 'fastify';
import { SendPromptToAI } from '../../application/useCases/SendPromptToAI';
import { GetConversationHistory } from '../../application/useCases/GetConversationHistory';
import { SendPromptRequest } from '../../application/dto/ChatDTO';

export class ChatController {
    constructor(
        private sendPromptToAI: SendPromptToAI,
        private getConversationHistory: GetConversationHistory
    ) { }

    async sendPrompt(request: FastifyRequest<{ Body: SendPromptRequest }>, reply: FastifyReply) {
        const result = await this.sendPromptToAI.execute(request.body);
        return reply.status(200).send(result);
    }

    async getHistory(request: FastifyRequest<{ Params: { conversationId: string }, Querystring: { userId: string } }>, reply: FastifyReply) {
        const result = await this.getConversationHistory.execute(request.params.conversationId, request.query.userId);
        return reply.status(200).send(result);
    }
}
