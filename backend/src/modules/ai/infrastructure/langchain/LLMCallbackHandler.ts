import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { LLMResult } from '@langchain/core/outputs';
import { Serialized } from '@langchain/core/load/serializable';

/**
 * LLMCallbackHandler — Capa 3: Observabilidad.
 * Se engancha al ciclo de vida de LangChain para registrar:
 *  - Inicio de llamada al LLM (longitud del prompt)
 *  - Fin de llamada (latencia en ms, tokens usados)
 *  - Errores con tiempo transcurrido
 *
 * No modifica el comportamiento del LLM — solo observa y loguea.
 */
export class LLMCallbackHandler extends BaseCallbackHandler {
  name = 'LLMCallbackHandler';

  // Mapa para rastrear el tiempo de inicio de cada llamada por su runId único
  private startTimes = new Map<string, number>();

  handleLLMStart(llm: Serialized, prompts: string[], runId: string): void {
    this.startTimes.set(runId, Date.now());

    const modelName = Array.isArray(llm.id) ? llm.id[llm.id.length - 1] : 'unknown';
    const promptLength = prompts[0]?.length ?? 0;

    console.log(`[LLM Callback] START — model: ${modelName} | prompt: ${promptLength} chars`);
  }

  handleLLMEnd(output: LLMResult, runId: string): void {
    const startTime = this.startTimes.get(runId);
    const latency = startTime !== undefined ? Date.now() - startTime : null;
    this.startTimes.delete(runId);

    // Google Gemini puede devolver el uso de tokens bajo distintas claves
    // dependiendo de la versión del SDK — revisamos las dos posibles
    const usageMetadata = output.llmOutput?.usageMetadata;
    const tokenUsage = output.llmOutput?.tokenUsage;

    const promptTokens =
      usageMetadata?.promptTokenCount ??
      tokenUsage?.promptTokens ??
      'N/A';

    const completionTokens =
      usageMetadata?.candidatesTokenCount ??
      tokenUsage?.completionTokens ??
      'N/A';

    const totalTokens =
      usageMetadata?.totalTokenCount ??
      tokenUsage?.totalTokens ??
      'N/A';

    console.log(
      `[LLM Callback] END — latency: ${latency !== null ? `${latency}ms` : 'N/A'} | tokens: { prompt: ${promptTokens}, completion: ${completionTokens}, total: ${totalTokens} }`
    );
  }

  handleLLMError(err: Error, runId: string): void {
    const startTime = this.startTimes.get(runId);
    const latency = startTime !== undefined ? Date.now() - startTime : null;
    this.startTimes.delete(runId);

    console.error(
      `[LLM Callback] ERROR — after ${latency !== null ? `${latency}ms` : 'N/A'} | ${err.message}`
    );
  }
}
