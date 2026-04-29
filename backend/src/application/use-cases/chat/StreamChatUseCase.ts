import { randomUUID } from 'crypto';
import { ConversationRepository } from '../../../domain/repositories/ConversationRepository';
import { AskAIQuestionUseCase } from '../../../modules/ai/application/usecases/AskAIQuestionUseCase';
import { ChatMessage } from '../../../modules/ai/domain/services/AIService';
import { Conversation } from '../../../domain/entities/Conversation';
import { Prompt } from '../../../domain/entities/Prompt';
import { AIResponse } from '../../../domain/entities/AIResponse';
import { SendPromptRequest } from '../../dto/ChatDTO';

const MAX_HISTORY_MESSAGES = 10;

export interface StreamChatResult {
    conversationId: string;
    stream: AsyncGenerator<string>;
    onComplete: (fullResponse: string) => Promise<void>;
}

export class StreamChatUseCase {
    constructor(
        private conversationRepository: ConversationRepository,
        private askAIQuestion: AskAIQuestionUseCase,
    ) {}

    async execute(request: SendPromptRequest): Promise<StreamChatResult> {
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

        const history: ChatMessage[] = [];
        for (const p of conversation.prompts) {
            history.push({ role: 'user', content: p.content });
            if (p.response) {
                history.push({ role: 'assistant', content: p.response.content });
            }
        }
        const recentHistory = history.slice(-MAX_HISTORY_MESSAGES);

        const promptId = randomUUID();
        const promptEntity = new Prompt(
            promptId,
            conversationId!,
            request.userId,
            request.prompt,
            request.model,
            new Date(),
        );
        await this.conversationRepository.savePrompt(promptEntity);

        const stream = this.askAIQuestion.executeStream(request.prompt, request.userId, recentHistory);

        const savedConversationId = conversationId!;
        const onComplete = async (fullResponse: string) => {
            const aiResponseEntity = new AIResponse(
                randomUUID(),
                promptId,
                fullResponse,
                request.model,
                0,
                new Date(),
            );
            promptEntity.response = aiResponseEntity;
            await this.conversationRepository.savePrompt(promptEntity);
        };

        return { conversationId: savedConversationId, stream, onComplete };
    }
}
