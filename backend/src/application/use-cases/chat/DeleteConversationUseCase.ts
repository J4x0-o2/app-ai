import { ConversationRepository } from '../../../domain/repositories/ConversationRepository';
import { ApplicationError } from '../../../shared/errors/errors';

export class DeleteConversationUseCase {
    constructor(private repo: ConversationRepository) {}

    async execute(id: string, userId: string): Promise<void> {
        const conv = await this.repo.findById(id);
        if (!conv) throw new ApplicationError('Conversation not found', 'NOT_FOUND');
        if (conv.userId !== userId) throw new ApplicationError('Unauthorized', 'UNAUTHORIZED');
        await this.repo.deleteById(id, userId);
    }
}
