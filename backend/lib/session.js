export const SESSION_COOKIE = 'dx_session';
export const OAUTH_STATE_COOKIE = 'dx_oauth_state';
export const OAUTH_RETURN_COOKIE = 'dx_oauth_return';
const SESSION_DAYS = 30;

function newSessionId() {
  return crypto.randomUUID() + crypto.randomUUID();
}

export async function createSession(env, user) {
  const id = newSessionId();
  await env.SESSIONS.put(`sess:${id}`, JSON.stringify(user), {
    expirationTtl: SESSION_DAYS * 24 * 60 * 60,
  });
  return id;
}

export async function destroySession(env, sessionId) {
  await env.SESSIONS.delete(`sess:${sessionId}`);
}

export async function getUserFromSession(env, sessionId) {
  if (!sessionId) return null;
  const raw = await env.SESSIONS.get(`sess:${sessionId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function sessionMaxAgeSeconds() {
  return SESSION_DAYS * 24 * 60 * 60;
}
