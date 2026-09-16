import { exchangeCodeForToken, fetchDiscordUser, discordAvatarUrl } from '../../../backend/lib/discord.js';
import { parseCookie, serializeCookie } from '../../../backend/lib/cookies.js';
import { rateLimit, clientIp } from '../../../backend/lib/rateLimit.js';
import { withQuotaHandling } from '../../../backend/lib/http.js';
import { d1Run } from '../../../backend/lib/db.js';
import {
  createSession,
  SESSION_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_RETURN_COOKIE,
  sessionMaxAgeSeconds,
} from '../../../backend/lib/session.js';

export const onRequestGet = withQuotaHandling(async (context) => {
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
    const avatar = discordAvatarUrl(discordUser);
    const user = { id: discordUser.id, username: discordUser.username, avatar };

    // Keep a persistent profile row so roles can be assigned to a Discord ID
    // even before/independently of the session snapshot below.
    await d1Run(
      env,
      `INSERT INTO users (id, username, avatar, updated_at) VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET username = excluded.username, avatar = excluded.avatar, updated_at = datetime('now')`,
      [user.id, user.username, user.avatar]
    );

    const sessionId = await createSession(env, user);
    const returnTo = parseCookie(cookieHeader, OAUTH_RETURN_COOKIE) || '/';

    const headers = new Headers();
    headers.append('Set-Cookie', serializeCookie(SESSION_COOKIE, sessionId, { maxAgeSeconds: sessionMaxAgeSeconds() }));
    headers.append('Set-Cookie', serializeCookie(OAUTH_STATE_COOKIE, '', { maxAgeSeconds: 0 }));
    headers.append('Set-Cookie', serializeCookie(OAUTH_RETURN_COOKIE, '', { maxAgeSeconds: 0 }));
    // No query string here: cachedPublicJson keys the edge cache by exact
    // URL, and an unused `?authed=1` would split the cache for e.g.
    // /anuncios/<slug> into two entries that never both get purged together.
    headers.set('Location', returnTo);
    return new Response(null, { status: 302, headers });
  } catch (err) {
    if (err && err.resource) throw err; // let withQuotaHandling turn this into a 429
    console.error('discord oauth callback failed', err);
    return new Response(JSON.stringify({ error: 'No se pudo completar el login con Discord.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
