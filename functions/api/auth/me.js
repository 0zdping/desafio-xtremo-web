import { parseCookie } from '../../../backend/lib/cookies.js';
import { getUserFromSession, SESSION_COOKIE } from '../../../backend/lib/session.js';
import { ensureCsrfCookie } from '../../../backend/lib/csrf.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const cookieHeader = request.headers.get('cookie');
  const sessionId = parseCookie(cookieHeader, SESSION_COOKIE);
  const user = await getUserFromSession(env, sessionId);
  const { token, setCookie } = ensureCsrfCookie(cookieHeader);

  const headers = { 'Content-Type': 'application/json' };
  const response = new Response(JSON.stringify({ user, csrfToken: token }), { headers });
  if (setCookie) response.headers.append('Set-Cookie', setCookie);
  return response;
}
