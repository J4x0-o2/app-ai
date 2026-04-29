import prisma from '../../../../infrastructure/database/prismaClient';
import { EmbeddingService } from '../../domain/services/EmbeddingService';
import { VectorSearchService } from '../../domain/services/VectorSearchService';
import { AIService, ChatMessage } from '../../domain/services/AIService';
import { ISemanticCache } from '../../domain/services/ISemanticCache';
import { InputGuardrail } from '../guardrails/InputGuardrail';
import { OutputGuardrail } from '../guardrails/OutputGuardrail';

export class AskAIQuestionUseCase {
  private inputGuardrail = new InputGuardrail();
  private outputGuardrail = new OutputGuardrail();

  constructor(
    private embeddingService: EmbeddingService,
    private vectorSearchService: VectorSearchService,
    private aiService: AIService,
    private semanticCache?: ISemanticCache
  ) {}

  async execute(question: string, userId?: string, history?: ChatMessage[]): Promise<string> {
    console.log(`[AI Query] Processing user question: "${question}"`);

    const inputCheck = this.inputGuardrail.validate(question);
    if (!inputCheck.allowed) {
      return inputCheck.reason!;
    }

    const queryEmbedding = await this.embeddingService.generateEmbedding(question);

    // Semantic cache check — before vector search to save the DB round-trip on hits
    if (this.semanticCache) {
      const cached = await this.semanticCache.get(queryEmbedding);
      if (cached) {
        console.log(`[AI Query] Cache HIT (similarity: ${cached.similarity.toFixed(3)})`);
        return cached.response;
      }
    }

    const searchResults = await this.vectorSearchService.search(queryEmbedding, 5);

    if (searchResults.length === 0) {
      console.log(`[AI Query] No relevant context found for question`);
      return "No cuento con información suficiente en la documentación disponible para responder esta consulta. Si considera que debería existir documentación al respecto, comuníquese con el administrador del sistema.";
    }

    const context = searchResults
      .map((result, index) => `--- Chunk ${index + 1} from Document ID: ${result.document_id} ---\n${result.content}`)
      .join('\n\n');

    console.log(`[AI Query] Retrieved ${searchResults.length} context chunks. Calling LLM...`);

    const rawAnswer = await this.aiService.answerQuestion(context, question, history);

    console.log(`[AI Query] LLM response generated successfully.`);

    const outputCheck = this.outputGuardrail.validate(rawAnswer);
    const answer = outputCheck.safe ? rawAnswer : this.outputGuardrail.getFallbackMessage();

    if (!outputCheck.safe) {
      console.warn(`[AI Query] Output guardrail triggered. Reason: ${outputCheck.reason}. Returning fallback message.`);
    }

    if (userId) {
      try {
        await prisma.ai_queries.create({
          data: { user_id: userId, question, response: answer, model_used: "gemini-2.5-flash" },
        });
        console.log(`[AI Query] Saved query log for user ${userId}`);
      } catch (err) {
        console.error(`[AI Query] Failed to save query to ai_queries for user ${userId}:`, err);
      }
    }

    // Store in cache asynchronously — don't delay the response to the user
    this.semanticCache?.set(queryEmbedding, question, answer)
      .catch(err => console.error('[AI Query] Cache store failed:', err));

    return answer;
  }

  async *executeStream(question: string, userId?: string, history?: ChatMessage[]): AsyncGenerator<string> {
    console.log(`[AI Query Stream] Processing question: "${question}"`);

    const inputCheck = this.inputGuardrail.validate(question);
    if (!inputCheck.allowed) {
      yield inputCheck.reason!;
      return;
    }

    const queryEmbedding = await this.embeddingService.generateEmbedding(question);

    // Semantic cache check — return cached response as a single chunk (frontend queue handles display)
    if (this.semanticCache) {
      const cached = await this.semanticCache.get(queryEmbedding);
      if (cached) {
        console.log(`[AI Query Stream] Cache HIT (similarity: ${cached.similarity.toFixed(3)})`);
        yield cached.response;
        return;
      }
    }

    const searchResults = await this.vectorSearchService.search(queryEmbedding, 5);

    if (searchResults.length === 0) {
      yield "No cuento con información suficiente en la documentación disponible para responder esta consulta. Si considera que debería existir documentación al respecto, comuníquese con el administrador del sistema.";
      return;
    }

    const context = searchResults
      .map((result, index) => `--- Chunk ${index + 1} from Document ID: ${result.document_id} ---\n${result.content}`)
      .join('\n\n');

    console.log(`[AI Query Stream] ${searchResults.length} context chunks. Starting stream...`);

    // Accumulate chunks so we can store the full response in cache after the stream completes
    let fullResponse = '';
    try {
      for await (const chunk of this.aiService.streamAnswer(context, question, history)) {
        fullResponse += chunk;
        yield chunk;
      }
      this.semanticCache?.set(queryEmbedding, question, fullResponse)
        .catch(err => console.error('[AI Query Stream] Cache store failed:', err));
    } catch (error) {
      console.error('[AI Query Stream] Stream error:', error);
      yield '\n\n*Ocurrió un error al generar la respuesta. Por favor, intenta nuevamente.*';
    }
  }
}
