import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { LLMResult } from '@langchain/core/outputs';
import { Serialized } from '@langchain/core/load/serializable';
import { getCorrelationId } from '../../../../shared/context/requestContext';

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

  private startTimes   = new Map<string, number>();
  private promptLengths = new Map<string, number>();

  // Expone las métricas del último LLM call para que el use case las persista en ai_queries
  public lastCallMetrics: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
    latencyMs: number | null;
    inputTokensEstimated: boolean;
  } | null = null;

  handleLLMStart(llm: Serialized, prompts: string[], runId: string): void {
    this.startTimes.set(runId, Date.now());
    this.promptLengths.set(runId, prompts[0]?.length ?? 0);

    const modelName = Array.isArray(llm.id) ? llm.id[llm.id.length - 1] : 'unknown';
    const promptLength = prompts[0]?.length ?? 0;

    console.log(`[LLM Callback][${getCorrelationId()}] START — model: ${modelName} | prompt: ${promptLength} chars`);
  }

  handleLLMEnd(output: LLMResult, runId: string): void {
    const startTime    = this.startTimes.get(runId);
    const promptLength = this.promptLengths.get(runId) ?? 0;
    const latencyMs    = startTime !== undefined ? Date.now() - startTime : null;

    this.startTimes.delete(runId);
    this.promptLengths.delete(runId);

    const tokenUsage = output.llmOutput?.tokenUsage;

    const outputTokens = tokenUsage?.completionTokens ?? null;

    // Gemini streaming no reporta prompt tokens (siempre 0).
    // Fallback: estimación estándar chars / 4.
    const rawPromptTokens = tokenUsage?.promptTokens ?? 0;
    const inputTokensEstimated = rawPromptTokens === 0 && promptLength > 0;
    const inputTokens = rawPromptTokens > 0
      ? rawPromptTokens
      : promptLength > 0 ? Math.round(promptLength / 4) : null;

    const totalTokens = inputTokens !== null && outputTokens !== null
      ? inputTokens + outputTokens
      : null;

    this.lastCallMetrics = { inputTokens, outputTokens, totalTokens, latencyMs, inputTokensEstimated };

    console.log(
      `[LLM Callback][${getCorrelationId()}] END — latency: ${latencyMs !== null ? `${latencyMs}ms` : 'N/A'} | tokens: { prompt: ${inputTokens ?? 'N/A'}${inputTokensEstimated ? ' (est)' : ''}, completion: ${outputTokens ?? 'N/A'}, total: ${totalTokens ?? 'N/A'} }`
    );
  }

  handleLLMError(err: Error, runId: string): void {
    const startTime = this.startTimes.get(runId);
    const latency = startTime !== undefined ? Date.now() - startTime : null;
    this.startTimes.delete(runId);

    console.error(
      `[LLM Callback][${getCorrelationId()}] ERROR — after ${latency !== null ? `${latency}ms` : 'N/A'} | ${err.message}`
    );
  }
}
