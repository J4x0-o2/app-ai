import { ConversationRepository } from '../../domain/repositories/ConversationRepository';
import { Conversation } from '../../domain/entities/Conversation';
import { Prompt } from '../../domain/entities/Prompt';
import { AIResponse } from '../../domain/entities/AIResponse';
import prisma from '../database/prismaClient';

export class PrismaConversationRepository implements ConversationRepository {
    async findById(id: string): Promise<Conversation | null> {
        const conv = await prisma.conversations.findUnique({
            where: { id }
        });

        if (!conv) return null;

        const prompts = await this.getPromptsByConversationId(id);

        return new Conversation(
            conv.id,
            conv.user_id,
            conv.created_at || new Date(),
            prompts
        );
    }

    async findByUserId(userId: string): Promise<Conversation[]> {
        const convs = await prisma.conversations.findMany({
            where: { user_id: userId }
        });

        // Normally we don't load all prompts for list, but if required by domain:
        const results: Conversation[] = [];
        for (const conv of convs) {
            results.push(new Conversation(
                conv.id,
                conv.user_id,
                conv.created_at || new Date(),
                [] // Keeping prompts empty or lazy loaded based on usage
            ));
        }

        return results;
    }

    async saveConversation(conversation: Conversation): Promise<void> {
        await prisma.conversations.upsert({
            where: { id: conversation.id },
            update: {
                user_id: conversation.userId
            },
            create: {
                id: conversation.id,
                user_id: conversation.userId,
                created_at: conversation.startedAt
            }
        });

        // Optionally save all prompts inside the conversation
        for (const prompt of conversation.prompts) {
            await this.savePrompt(prompt);
        }
    }

    async savePrompt(prompt: Prompt): Promise<void> {
        // We use 'messages' to store both prompt and response
        await prisma.messages.create({
            data: {
                id: prompt.id,
                conversation_id: prompt.conversationId,
                sender_role: 'user',
                content: prompt.content,
                created_at: prompt.sentAt
            }
        });

        if (prompt.response) {
            await prisma.messages.create({
                data: {
                    id: prompt.response.id,
                    conversation_id: prompt.conversationId,
                    sender_role: 'assistant',
                    content: prompt.response.content,
                    created_at: prompt.response.receivedAt
                }
            });
        }
    }

    async getPromptsByConversationId(conversationId: string): Promise<Prompt[]> {
        const messages = await prisma.messages.findMany({
            where: { conversation_id: conversationId },
            orderBy: { created_at: 'asc' }
        });

        const prompts: Prompt[] = [];
        
        // Group user prompt and assistant response
        let currentPrompt: Prompt | null = null;
        
        for (const msg of messages) {
            if (msg.sender_role === 'user') {
                currentPrompt = new Prompt(
                    msg.id,
                    msg.conversation_id,
                    'system', // We don't have user_id on message level, default or pass it
                    msg.content,
                    'unknown', // model param missing in message 
                    msg.created_at || new Date()
                );
                prompts.push(currentPrompt);
            } else if (msg.sender_role === 'assistant' || msg.sender_role === 'model') {
                if (currentPrompt) {
                    currentPrompt.response = new AIResponse(
                        msg.id,
                        currentPrompt.id,
                        msg.content,
                        'unknown',
                        0,
                        msg.created_at || new Date()
                    );
                } else {
                    // response without prompt
                }
            }
        }

        return prompts;
    }
}
