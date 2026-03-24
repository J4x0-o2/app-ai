import { ConversationRepository } from '../../domain/repositories/ConversationRepository';
import { AskAIQuestionUseCase } from '../../modules/ai/application/usecases/AskAIQuestionUseCase';
import { Conversation } from '../../domain/entities/Conversation';
import { Prompt } from '../../domain/entities/Prompt';
import { AIResponse } from '../../domain/entities/AIResponse';
import { SendPromptRequest, SendPromptResponse } from '../dto/ChatDTO';
import { randomUUID } from 'crypto';

export class SendPromptToAI {
    constructor(
        private conversationRepository: ConversationRepository,
        private askAIQuestion: AskAIQuestionUseCase
    ) { }

    async execute(request: SendPromptRequest): Promise<SendPromptResponse> {
        let conversation: Conversation | null = null;
        let conversationId = request.conversationId;

        if (conversationId) {
            conversation = await this.conversationRepository.findById(conversationId);
        }

        if (!conversation) {
            conversationId = randomUUID();
            conversation = new Conversation(conversationId, request.userId, new Date());
            await this.conversationRepository.saveConversation(conversation);
        }

        const promptId = randomUUID();
        const promptEntity = new Prompt(
            promptId,
            conversationId!,
            request.userId,
            request.prompt,
            request.model,
            new Date()
        );

        await this.conversationRepository.savePrompt(promptEntity);

        // Llama al pipeline real de RAG: embedding → vector search → Gemini
        const aiAnswer = await this.askAIQuestion.execute(request.prompt, request.userId);

        const aiResponseEntity = new AIResponse(
            randomUUID(),
            promptId,
            aiAnswer,
            request.model,
            0,
            new Date()
        );

        promptEntity.response = aiResponseEntity;

        await this.conversationRepository.savePrompt(promptEntity);

        return {
            conversationId: conversationId!,
            response: aiResponseEntity
        };
    }
}
