import { parseCookie, serializeCookie } from '../../../backend/lib/cookies.js';
import { destroySession, SESSION_COOKIE } from '../../../backend/lib/session.js';
import { verifyCsrf } from '../../../backend/lib/csrf.js';
import { withQuotaHandling, jsonResponse } from '../../../backend/lib/http.js';

export const onRequestPost = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const cookieHeader = request.headers.get('cookie');
  const csrfHeader = request.headers.get('x-csrf-token');

  if (!verifyCsrf(cookieHeader, csrfHeader)) {
    return jsonResponse({ error: 'CSRF inválido.' }, 403);
  }

  const sessionId = parseCookie(cookieHeader, SESSION_COOKIE);
  if (sessionId) await destroySession(env, sessionId);

  return new Response(null, {
    status: 204,
    headers: { 'Set-Cookie': serializeCookie(SESSION_COOKIE, '', { maxAgeSeconds: 0 }) },
  });
});
