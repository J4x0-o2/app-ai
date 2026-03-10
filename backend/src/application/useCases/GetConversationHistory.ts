import { ConversationRepository } from '../../domain/repositories/ConversationRepository';
import { ConversationHistoryResponse } from '../dto/ChatDTO';
import { ApplicationError } from '../../shared/errors/errors';

export class GetConversationHistory {
    constructor(private conversationRepository: ConversationRepository) { }

    async execute(conversationId: string, userId: string): Promise<ConversationHistoryResponse> {
        const conversation = await this.conversationRepository.findById(conversationId);
        if (!conversation) {
            throw new ApplicationError('Conversation not found', 'NOT_FOUND');
        }

        if (conversation.userId !== userId) {
            throw new ApplicationError('Unauthorized access to conversation', 'UNAUTHORIZED');
        }

        const prompts = await this.conversationRepository.getPromptsByConversationId(conversationId);

        return {
            conversationId: conversation.id,
            startedAt: conversation.startedAt,
            prompts: prompts.map(p => ({
                id: p.id,
                content: p.content,
                response: p.response?.content,
                sentAt: p.sentAt
            }))
        };
    }
}
