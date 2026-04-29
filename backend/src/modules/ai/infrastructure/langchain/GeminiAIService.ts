import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AIService, ChatMessage } from "../../domain/services/AIService";
import { LLMCallbackHandler } from "./LLMCallbackHandler";

export class GeminiAIService implements AIService {
  private llm: ChatGoogleGenerativeAI;

  constructor() {
    this.llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0,
      callbacks: [new LLMCallbackHandler()],
    });
  }

  private buildPrompt(context: string, question: string, history?: ChatMessage[]): string {
    const historyBlock =
      history && history.length > 0
        ? `\nHISTORIAL DE CONVERSACIÓN (turnos previos):\n${history
            .map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
            .join('\n')}\n`
        : '';

    return `Eres un asistente empresarial de consulta interna. Tu única fuente de información es la documentación oficial de la empresa que se te proporciona a continuación.

REGLAS ESTRICTAS:
1. Responde ÚNICAMENTE basándote en el contexto proporcionado. No uses conocimiento externo.
2. Si la respuesta no está en el contexto, responde exactamente: "No cuento con información suficiente en la documentación disponible para responder esta consulta."
3. Si la pregunta es parcialmente respondible, indica claramente qué parte puedes responder y en qué parte no tienes información.
4. Nunca inventes datos, cifras, procesos o procedimientos que no estén explícitamente en el contexto.
5. Responde siempre en español.
6. Sé claro y conciso.
7. Usa el historial de conversación para mantener coherencia, profundizar en temas ya tratados y responder preguntas de seguimiento.

FORMATO DE RESPUESTA (usa Markdown):
- Usa **negrita** para resaltar términos clave o datos importantes.
- Usa listas con viñetas (- item) cuando enumeres elementos sin orden específico.
- Usa listas numeradas (1. item) cuando los pasos tengan un orden obligatorio.
- Usa encabezados (## Título) solo si la respuesta cubre más de un tema diferente.
- Separa los párrafos con una línea en blanco para facilitar la lectura.
- No uses bloques de código a menos que la pregunta sea explícitamente técnica.
- Si la respuesta es breve y directa, un solo párrafo es suficiente — no fuerces estructura innecesaria.

CONTEXTO DOCUMENTAL:
${context}
${historyBlock}
CONSULTA ACTUAL:
${question}

RESPUESTA:`;
  }

  async answerQuestion(context: string, question: string, history?: ChatMessage[]): Promise<string> {
    const prompt = this.buildPrompt(context, question, history);
    try {
      const response = await this.llm.invoke(prompt);
      return response.content.toString();
    } catch (error) {
      console.error("Error answering question with LLM:", error);
      throw new Error(`Failed to answer question: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async *streamAnswer(context: string, question: string, history?: ChatMessage[]): AsyncGenerator<string> {
    const prompt = this.buildPrompt(context, question, history);
    try {
      const stream = await this.llm.stream(prompt);
      for await (const chunk of stream) {
        const text = typeof chunk.content === 'string' ? chunk.content : '';
        if (text) yield text;
      }
    } catch (error) {
      console.error("Error streaming answer from LLM:", error);
      throw new Error(`Failed to stream answer: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
