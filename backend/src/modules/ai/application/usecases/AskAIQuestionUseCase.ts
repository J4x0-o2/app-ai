import prisma from '../../../../infrastructure/database/prismaClient';
import { EmbeddingService } from '../../domain/services/EmbeddingService';
import { VectorSearchService } from '../../domain/services/VectorSearchService';
import { AIService, ChatMessage, LLMCallMetrics } from '../../domain/services/AIService';
import { ISemanticCache } from '../../domain/services/ISemanticCache';
import { InputGuardrail } from '../guardrails/InputGuardrail';
import { OutputGuardrail } from '../guardrails/OutputGuardrail';

const AI_PROVIDER = 'gemini';
const AI_MODEL = 'gemini-2.5-flash';

function todayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function upsertCacheStats(hit: boolean): Promise<void> {
  const today = todayUTC();
  try {
    await prisma.ai_cache_stats.upsert({
      where: { date_provider_model: { date: today, provider: AI_PROVIDER, model: AI_MODEL } },
      update: hit
        ? { hits: { increment: 1 }, updated_at: new Date() }
        : { misses: { increment: 1 }, updated_at: new Date() },
      create: {
        date: today,
        provider: AI_PROVIDER,
        model: AI_MODEL,
        hits: hit ? 1 : 0,
        misses: hit ? 0 : 1,
      },
    });
  } catch (err) {
    console.error('[AI Query] Failed to upsert ai_cache_stats:', err);
  }
}

async function persistQuery(
  userId: string,
  question: string,
  answer: string,
  metrics: LLMCallMetrics | null
): Promise<void> {
  try {
    await prisma.ai_queries.create({
      data: {
        user_id: userId,
        question,
        response: answer,
        model_used: AI_MODEL,
        provider: AI_PROVIDER,
        tokens_used: metrics?.totalTokens ?? null,
        input_tokens: metrics?.inputTokens ?? null,
        output_tokens: metrics?.outputTokens ?? null,
        input_tokens_estimated: metrics?.inputTokensEstimated ?? false,
        latency_ms: metrics?.latencyMs ?? null,
      },
    });
    console.log(`[AI Query] Saved query log for user ${userId}`);
  } catch (err) {
    console.error(`[AI Query] Failed to save query to ai_queries for user ${userId}:`, err);
  }
}

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
        upsertCacheStats(true).catch(() => {});
        return cached.response;
      }
      upsertCacheStats(false).catch(() => {});
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
    const metrics = this.aiService.getLastCallMetrics?.() ?? null;

    console.log(`[AI Query] LLM response generated successfully.`);

    const outputCheck = this.outputGuardrail.validate(rawAnswer);
    const answer = outputCheck.safe ? rawAnswer : this.outputGuardrail.getFallbackMessage();

    if (!outputCheck.safe) {
      console.warn(`[AI Query] Output guardrail triggered. Reason: ${outputCheck.reason}. Returning fallback message.`);
    }

    if (userId) {
      persistQuery(userId, question, answer, metrics);
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
        upsertCacheStats(true).catch(() => {});
        yield cached.response;
        return;
      }
      upsertCacheStats(false).catch(() => {});
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

    let fullResponse = '';
    try {
      for await (const chunk of this.aiService.streamAnswer(context, question, history)) {
        fullResponse += chunk;
        yield chunk;
      }

      const metrics = this.aiService.getLastCallMetrics?.() ?? null;

      if (userId) {
        persistQuery(userId, question, fullResponse, metrics);
      }

      this.semanticCache?.set(queryEmbedding, question, fullResponse)
        .catch(err => console.error('[AI Query Stream] Cache store failed:', err));
    } catch (error) {
      console.error('[AI Query Stream] Stream error:', error);
      yield '\n\n*Ocurrió un error al generar la respuesta. Por favor, intenta nuevamente.*';
    }
  }
}
