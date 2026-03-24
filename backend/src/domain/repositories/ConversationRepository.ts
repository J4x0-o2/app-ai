import { Conversation } from '../entities/Conversation';
import { Prompt } from '../entities/Prompt';

export interface ConversationRepository {
    findById(id: string): Promise<Conversation | null>;
    findByUserId(userId: string): Promise<Conversation[]>;
    saveConversation(conversation: Conversation): Promise<void>;
    savePrompt(prompt: Prompt): Promise<void>;
    getPromptsByConversationId(conversationId: string): Promise<Prompt[]>;
    deleteById(id: string, userId: string): Promise<void>;
}
