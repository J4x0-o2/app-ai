import { ConversationRepository } from '../../domain/repositories/ConversationRepository';
import { Conversation } from '../../domain/entities/Conversation';
import { Prompt } from '../../domain/entities/Prompt';

export class MockConversationRepository implements ConversationRepository {
    private conversations: Map<string, Conversation> = new Map();
    private prompts: Map<string, Prompt> = new Map();

    async findById(id: string): Promise<Conversation | null> {
        return this.conversations.get(id) || null;
    }

    async findByUserId(userId: string): Promise<Conversation[]> {
        return Array.from(this.conversations.values()).filter(conv => conv.userId === userId);
    }

    async saveConversation(conversation: Conversation): Promise<void> {
        this.conversations.set(conversation.id, conversation);
    }

    async savePrompt(prompt: Prompt): Promise<void> {
        this.prompts.set(prompt.id, prompt);
    }

    async getPromptsByConversationId(conversationId: string): Promise<Prompt[]> {
        return Array.from(this.prompts.values())
            .filter(p => p.conversationId === conversationId)
            .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
    }
}
