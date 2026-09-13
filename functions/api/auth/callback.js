import { exchangeCodeForToken, fetchDiscordUser, discordAvatarUrl } from '../../../backend/lib/discord.js';
import { parseCookie, serializeCookie } from '../../../backend/lib/cookies.js';
import { rateLimit, clientIp } from '../../../backend/lib/rateLimit.js';
import {
  createSession,
  SESSION_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_RETURN_COOKIE,
  sessionMaxAgeSeconds,
} from '../../../backend/lib/session.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const ip = clientIp(request);
  const { allowed } = await rateLimit(env, `auth-callback:${ip}`, 15, 60);
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Demasiados intentos. Prueba en un minuto.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieHeader = request.headers.get('cookie');
  const expectedState = parseCookie(cookieHeader, OAUTH_STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return new Response(JSON.stringify({ error: 'Estado de OAuth inválido. Vuelve a intentarlo.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const token = await exchangeCodeForToken(env, code);
    const discordUser = await fetchDiscordUser(token.access_token);
    const user = {
      id: discordUser.id,
      username: discordUser.username,
      avatar: discordAvatarUrl(discordUser),
    };

    const sessionId = await createSession(env, user);
    const returnTo = parseCookie(cookieHeader, OAUTH_RETURN_COOKIE) || '/';

    const headers = new Headers();
    headers.append('Set-Cookie', serializeCookie(SESSION_COOKIE, sessionId, { maxAgeSeconds: sessionMaxAgeSeconds() }));
    headers.append('Set-Cookie', serializeCookie(OAUTH_STATE_COOKIE, '', { maxAgeSeconds: 0 }));
    headers.append('Set-Cookie', serializeCookie(OAUTH_RETURN_COOKIE, '', { maxAgeSeconds: 0 }));
    headers.set('Location', `${returnTo}?authed=1`);
    return new Response(null, { status: 302, headers });
  } catch (err) {
    console.error('discord oauth callback failed', err);
    return new Response(JSON.stringify({ error: 'No se pudo completar el login con Discord.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
