import { QuotaExceededError } from './quota.js';

export function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

/** Wrap a Pages Function handler so a QuotaExceededError becomes a clean 429
 *  ("block the request") instead of bubbling up as a raw 500. */
export function withQuotaHandling(handler) {
  return async (context) => {
    try {
      return await handler(context);
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        return jsonResponse(
          {
            error: 'Límite de uso gratuito alcanzado por hoy. La solicitud se bloqueó a propósito para no generar cargos.',
            resource: err.resource,
          },
          429
        );
      }
      console.error('request handler error', err);
      return jsonResponse({ error: 'Error interno.' }, 500);
    }
  };
}
