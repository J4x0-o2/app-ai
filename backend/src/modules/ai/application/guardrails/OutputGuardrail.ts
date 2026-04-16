export interface OutputGuardrailResult {
  safe: boolean;
  reason?: string;
}

const FALLBACK_MESSAGE =
  'No cuento con información suficiente en la documentación disponible para responder esta consulta. Si considera que debería existir documentación al respecto, comuníquese con el administrador del sistema.';

/**
 * OutputGuardrail — Capa 2 de seguridad.
 * Valida la respuesta del LLM ANTES de devolverla al usuario.
 * Si la respuesta no es segura, se reemplaza por un mensaje neutro estándar.
 */
export class OutputGuardrail {
  private static readonly MIN_LENGTH = 10;
  private static readonly MAX_LENGTH = 8000;

  // El LLM escapó su rol e intenta identificarse como otra cosa
  private static readonly ROLE_ESCAPE_PATTERNS: RegExp[] = [
    /soy\s+(gemini|chatgpt|gpt|claude|una\s+ia\s+de\s+google|un\s+modelo\s+de\s+lenguaje)/i,
    /como\s+(modelo\s+de\s+lenguaje|ia\s+generativa|inteligencia\s+artificial\s+de)/i,
    /fui\s+(entrenado|creado|desarrollado)\s+(por\s+google|por\s+openai|por\s+anthropic)/i,
    /i\s+am\s+(gemini|chatgpt|an\s+ai|a\s+language\s+model)/i,
  ];

  // El LLM usó conocimiento fuera del contexto documental
  private static readonly EXTERNAL_KNOWLEDGE_PATTERNS: RegExp[] = [
    /según\s+mis\s+conocimientos/i,
    /basándome\s+en\s+mi\s+(entrenamiento|conocimiento|experiencia)/i,
    /basandome\s+en\s+mi\s+(entrenamiento|conocimiento|experiencia)/i,
    /de\s+acuerdo\s+con\s+mi\s+entrenamiento/i,
    /en\s+términos\s+generales\s+(y\s+fuera|más\s+allá)/i,
    /aunque\s+no\s+está\s+en\s+el\s+contexto/i,
    /aunque\s+no\s+se\s+menciona\s+en\s+el\s+contexto/i,
    /según\s+información\s+(pública|general|externa|disponible\s+en\s+internet)/i,
    /based\s+on\s+my\s+(training|knowledge)/i,
    /according\s+to\s+my\s+(training|knowledge)/i,
  ];

  validate(response: string): OutputGuardrailResult {
    const trimmed = response.trim();

    // 1. Respuesta vacía
    if (!trimmed) {
      console.warn('[OutputGuardrail] UNSAFE — empty response from LLM');
      return { safe: false, reason: 'empty_response' };
    }

    // 2. Respuesta demasiado corta
    if (trimmed.length < OutputGuardrail.MIN_LENGTH) {
      console.warn(`[OutputGuardrail] UNSAFE — response too short: "${trimmed}"`);
      return { safe: false, reason: 'too_short' };
    }

    // 3. Respuesta demasiado larga (posible loop o comportamiento anómalo)
    if (trimmed.length > OutputGuardrail.MAX_LENGTH) {
      console.warn(`[OutputGuardrail] UNSAFE — response too long: ${trimmed.length} chars`);
      return { safe: false, reason: 'too_long' };
    }

    // 4. Escape de rol — el LLM se identificó como otra IA
    for (const pattern of OutputGuardrail.ROLE_ESCAPE_PATTERNS) {
      if (pattern.test(trimmed)) {
        console.warn(`[OutputGuardrail] UNSAFE — role escape detected: ${pattern}`);
        return { safe: false, reason: 'role_escape' };
      }
    }

    // 5. Conocimiento externo — el LLM salió del contexto documental
    for (const pattern of OutputGuardrail.EXTERNAL_KNOWLEDGE_PATTERNS) {
      if (pattern.test(trimmed)) {
        console.warn(`[OutputGuardrail] UNSAFE — external knowledge detected: ${pattern}`);
        return { safe: false, reason: 'external_knowledge' };
      }
    }

    console.log('[OutputGuardrail] SAFE — response passed all checks');
    return { safe: true };
  }

  getFallbackMessage(): string {
    return FALLBACK_MESSAGE;
  }
}
