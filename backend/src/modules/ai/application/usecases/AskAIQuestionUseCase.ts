import prisma from '../../../../infrastructure/database/prismaClient';
import { EmbeddingService } from '../../domain/services/EmbeddingService';
import { VectorSearchService } from '../../domain/services/VectorSearchService';
import { AIService } from '../../domain/services/AIService';
import { InputGuardrail } from '../guardrails/InputGuardrail';
import { OutputGuardrail } from '../guardrails/OutputGuardrail';

export class AskAIQuestionUseCase {
  private inputGuardrail = new InputGuardrail();
  private outputGuardrail = new OutputGuardrail();

  constructor(
    private embeddingService: EmbeddingService,
    private vectorSearchService: VectorSearchService,
    private aiService: AIService
  ) {}

  async execute(question: string, userId?: string): Promise<string> {
    console.log(`[AI Query] Processing user question: "${question}"`);

    // 0. Input Guardrail — validar antes de cualquier llamada al LLM
    const inputCheck = this.inputGuardrail.validate(question);
    if (!inputCheck.allowed) {
      return inputCheck.reason!;
    }

    // 1. Generate query embedding
    const queryEmbedding = await this.embeddingService.generateEmbedding(question);

    // 2. Perform vector search (top 5 chunks)
    const topK = 5;
    const searchResults = await this.vectorSearchService.search(queryEmbedding, topK);

    if (searchResults.length === 0) {
      console.log(`[AI Query] No relevant context found for question`);
      return "No cuento con información suficiente en la documentación disponible para responder esta consulta. Si considera que debería existir documentación al respecto, comuníquese con el administrador del sistema.";
    }

    // 3. Build context block
    const context = searchResults
      .map((result, index) => `--- Chunk ${index + 1} from Document ID: ${result.document_id} ---\n${result.content}`)
      .join('\n\n');

    console.log(`[AI Query] Retrieved ${searchResults.length} context chunks. Calling LLM...`);

    // 4. Send to LLM
    const rawAnswer = await this.aiService.answerQuestion(context, question);

    console.log(`[AI Query] LLM response generated successfully.`);

    // 5. Output Guardrail — validar la respuesta antes de devolverla
    const outputCheck = this.outputGuardrail.validate(rawAnswer);
    const answer = outputCheck.safe ? rawAnswer : this.outputGuardrail.getFallbackMessage();

    if (!outputCheck.safe) {
      console.warn(`[AI Query] Output guardrail triggered. Reason: ${outputCheck.reason}. Returning fallback message.`);
    }

    // 5. Optionally log the query in the database
    if (userId) {
      try {
        await prisma.ai_queries.create({
          data: {
            user_id: userId,
            question,
            response: answer,
            model_used: "gemini-2.5-flash",
          },
        });
        console.log(`[AI Query] Saved query log for user ${userId}`);
      } catch (err) {
        console.error(`[AI Query] Failed to save query to ai_queries for user ${userId}:`, err);
      }
    }

    return answer;
  }
}
