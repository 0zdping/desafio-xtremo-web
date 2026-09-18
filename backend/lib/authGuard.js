import { parseCookie } from './cookies.js';
import { getUserFromSession, SESSION_COOKIE } from './session.js';
import { verifyCsrf } from './csrf.js';

export { jsonResponse, withQuotaHandling } from './http.js';

/** For public (non-admin) actions that just need *some* logged-in user,
 *  no permission/role check, unlike requirePermission. */
export async function requireAuth(request, env) {
  const cookieHeader = request.headers.get('cookie');
  const sessionId = parseCookie(cookieHeader, SESSION_COOKIE);
  const user = await getUserFromSession(env, sessionId);
  if (!user) return { ok: false, status: 401, body: { error: 'Inicia sesión para hacer esto.' } };
  return { ok: true, user };
}

/** Same as requireAuth, plus the double-submit CSRF check for state-changing requests. */
export async function requireAuthAndCsrf(request, env) {
  const guard = await requireAuth(request, env);
  if (!guard.ok) return guard;

  const cookieHeader = request.headers.get('cookie');
  const csrfHeader = request.headers.get('x-csrf-token');
  if (!verifyCsrf(cookieHeader, csrfHeader)) {
    return { ok: false, status: 403, body: { error: 'CSRF inválido.' } };
  }
  return guard;
}
