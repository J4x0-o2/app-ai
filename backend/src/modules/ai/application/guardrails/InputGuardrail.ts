export interface GuardrailResult {
  allowed: boolean;
  reason?: string;
}

/**
 * InputGuardrail — Capa 1 de seguridad.
 * Valida la pregunta del usuario ANTES de enviarla al LLM.
 * Si el resultado es allowed: false, el flujo se detiene aquí.
 */
export class InputGuardrail {
  private static readonly MIN_LENGTH = 5;
  private static readonly MAX_LENGTH = 1000;

  // Patrones de prompt injection y jailbreak
  private static readonly BLOCKED_PATTERNS: RegExp[] = [
    // Cambio de rol / persona
    /actúa\s+como/i,
    /actua\s+como/i,
    /eres\s+un\s+(experto|asistente|bot|sistema|hacker|agente)/i,
    /a\s+partir\s+de\s+ahora\s+(eres|serás|debes)/i,
    /desde\s+ahora\s+(eres|actúa|actua)/i,
    /compórtate\s+como/i,
    /comportate\s+como/i,
    /finge\s+(que\s+eres|ser)/i,
    /pretende\s+(que\s+eres|ser)/i,
    /imagina\s+que\s+eres/i,
    /tu\s+nuevo\s+rol/i,
    /asume\s+el\s+rol/i,

    // Ignorar instrucciones
    /ignora\s+(tus\s+)?(instrucciones|reglas|restricciones|límites|limites)/i,
    /olvida\s+(todo|tus\s+instrucciones|las\s+reglas)/i,
    /no\s+sigas\s+(tus\s+)?(instrucciones|reglas)/i,
    /sin\s+restricciones/i,
    /sin\s+límites/i,
    /sin\s+limites/i,
    /sin\s+filtros/i,

    // Jailbreak conocidos
    /modo\s+(developer|desarrollador|dios|god|libre|unrestricted)/i,
    /\bdan\b/i,           // "Do Anything Now"
    /jailbreak/i,
    /bypass/i,

    // Intentos en inglés (común aunque la app sea en español)
    /act\s+as/i,
    /you\s+are\s+(now\s+)?(a|an)/i,
    /ignore\s+(your\s+)?(instructions|rules|restrictions)/i,
    /forget\s+(everything|your\s+instructions)/i,
    /from\s+now\s+on/i,
    /disregard\s+(your\s+)?(previous|instructions)/i,
  ];

  validate(question: string): GuardrailResult {
    const trimmed = question.trim();

    // 1. Longitud mínima
    if (trimmed.length < InputGuardrail.MIN_LENGTH) {
      console.warn(`[InputGuardrail] BLOCKED — too short: "${trimmed}"`);
      return {
        allowed: false,
        reason: 'La consulta es demasiado corta. Por favor, elabora tu pregunta.',
      };
    }

    // 2. Longitud máxima
    if (trimmed.length > InputGuardrail.MAX_LENGTH) {
      console.warn(`[InputGuardrail] BLOCKED — too long: ${trimmed.length} chars`);
      return {
        allowed: false,
        reason: 'La consulta excede el límite de caracteres permitido.',
      };
    }

    // 3. Patrones de prompt injection / jailbreak
    for (const pattern of InputGuardrail.BLOCKED_PATTERNS) {
      if (pattern.test(trimmed)) {
        console.warn(`[InputGuardrail] BLOCKED — injection pattern matched: ${pattern} | input: "${trimmed}"`);
        return {
          allowed: false,
          reason: 'Consulta no permitida. Solo puedo responder preguntas sobre la documentación interna de la empresa.',
        };
      }
    }

    console.log(`[InputGuardrail] ALLOWED — question passed all checks`);
    return { allowed: true };
  }
}
