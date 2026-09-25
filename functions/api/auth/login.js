import { buildDiscordAuthorizeUrl } from '../../../backend/lib/discord.js';
import { serializeCookie } from '../../../backend/lib/cookies.js';
import { rateLimit, clientIp } from '../../../backend/lib/rateLimit.js';
import { OAUTH_STATE_COOKIE, OAUTH_RETURN_COOKIE } from '../../../backend/lib/session.js';
import { withQuotaHandling } from '../../../backend/lib/http.js';
import { safeReturnPath } from '../../../backend/lib/redirect.js';


export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const ip = clientIp(request);
  const { allowed } = await rateLimit(env, `auth-login:${ip}`, 10, 60);
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Demasiados intentos. Prueba en un minuto.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const state = crypto.randomUUID();
  const returnTo = safeReturnPath(url.searchParams.get('return_to'));
  const authorizeUrl = buildDiscordAuthorizeUrl(env, state);

  const headers = new Headers();
  headers.append('Set-Cookie', serializeCookie(OAUTH_STATE_COOKIE, state, { maxAgeSeconds: 600 }));
  headers.append('Set-Cookie', serializeCookie(OAUTH_RETURN_COOKIE, returnTo, { maxAgeSeconds: 600 }));
  headers.set('Location', authorizeUrl);
  return new Response(null, { status: 302, headers });
});
