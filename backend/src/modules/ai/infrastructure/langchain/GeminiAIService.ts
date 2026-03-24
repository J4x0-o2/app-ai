import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AIService } from "../../domain/services/AIService";

export class GeminiAIService implements AIService {
  private llm: ChatGoogleGenerativeAI;

  constructor() {
    this.llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0,
    });
  }

  async answerQuestion(context: string, question: string): Promise<string> {
    const prompt = `Eres un asistente empresarial de consulta interna. Tu única fuente de información es la documentación oficial de la empresa que se te proporciona a continuación.

REGLAS ESTRICTAS:
1. Responde ÚNICAMENTE basándote en el contexto proporcionado. No uses conocimiento externo.
2. Si la respuesta no está en el contexto, responde exactamente: "No cuento con información suficiente en la documentación disponible para responder esta consulta."
3. Si la pregunta es parcialmente respondible, indica claramente qué parte puedes responder y en qué parte no tienes información.
4. Nunca inventes datos, cifras, procesos o procedimientos que no estén explícitamente en el contexto.
5. Responde siempre en español.
6. Sé claro y conciso.

CONTEXTO DOCUMENTAL:
${context}

CONSULTA:
${question}

RESPUESTA:`;

    try {
      const response = await this.llm.invoke(prompt);
      return response.content.toString();
    } catch (error) {
      console.error("Error answering question with LLM:", error);
      throw new Error(`Failed to answer question: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
