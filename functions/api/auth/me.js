import { parseCookie } from '../../../backend/lib/cookies.js';
import { getUserFromSession, SESSION_COOKIE } from '../../../backend/lib/session.js';
import { ensureCsrfCookie } from '../../../backend/lib/csrf.js';
import { getUserRolesAndPermissions } from '../../../backend/lib/permissions.js';
import { withQuotaHandling, jsonResponse } from '../../../backend/lib/http.js';

export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const cookieHeader = request.headers.get('cookie');
  const sessionId = parseCookie(cookieHeader, SESSION_COOKIE);
  const sessionUser = await getUserFromSession(env, sessionId);
  const { token, setCookie } = ensureCsrfCookie(cookieHeader);

  let user = null;
  if (sessionUser) {
    const { roles, permissions } = await getUserRolesAndPermissions(env, sessionUser.id);
    user = { ...sessionUser, roles, permissions };
  }

  const response = jsonResponse({ user, csrfToken: token });
  if (setCookie) response.headers.append('Set-Cookie', setCookie);
  return response;
});
