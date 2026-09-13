import { parseCookie } from './cookies.js';
import { getUserFromSession, SESSION_COOKIE } from './session.js';
import { getUserRolesAndPermissions, hasPermission } from './permissions.js';
import { verifyCsrf } from './csrf.js';

export { jsonResponse, withQuotaHandling } from './http.js';

/** Loads the session user + their permissions and checks `permKey`.
 *  Returns { ok:true, user, permissions } or { ok:false, status, body }. */
export async function requirePermission(request, env, permKey) {
  const cookieHeader = request.headers.get('cookie');
  const sessionId = parseCookie(cookieHeader, SESSION_COOKIE);
  const user = await getUserFromSession(env, sessionId);
  if (!user) return { ok: false, status: 401, body: { error: 'No autenticado.' } };

  const { roles, permissions } = await getUserRolesAndPermissions(env, user.id);
  if (!hasPermission(permissions, permKey)) {
    return { ok: false, status: 403, body: { error: 'No autorizado.' } };
  }
  return { ok: true, user, roles, permissions };
}

/** For state-changing requests: same as requirePermission, plus the
 *  double-submit CSRF check used across the site. */
export async function requirePermissionAndCsrf(request, env, permKey) {
  const guard = await requirePermission(request, env, permKey);
  if (!guard.ok) return guard;

  const cookieHeader = request.headers.get('cookie');
  const csrfHeader = request.headers.get('x-csrf-token');
  if (!verifyCsrf(cookieHeader, csrfHeader)) {
    return { ok: false, status: 403, body: { error: 'CSRF inválido.' } };
  }
  return guard;
}
