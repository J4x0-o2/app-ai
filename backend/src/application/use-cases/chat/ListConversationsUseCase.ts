import { ConversationRepository } from '../../../domain/repositories/ConversationRepository';

export interface ConversationSummary {
    id: string;
    title: string;
    createdAt: Date;
}

export class ListConversationsUseCase {
    constructor(private repo: ConversationRepository) {}

    async execute(userId: string): Promise<ConversationSummary[]> {
        const conversations = await this.repo.findByUserId(userId);
        return conversations.map(c => ({
            id: c.id,
            title: c.title ?? 'Nueva conversación',
            createdAt: c.startedAt,
        }));
    }
}
