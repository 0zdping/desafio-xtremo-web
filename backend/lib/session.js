import { checkQuota, addUsage, QuotaExceededError } from './quota.js';

export const SESSION_COOKIE = 'dx_session';
// Pista visible para el JS (sin el id de sesión, solo "1"): si no está, la página sabe que no hay
// sesión y se ahorra la petición a /api/auth/me, que gasta del límite diario de Functions.
export const SESSION_HINT_COOKIE = 'dx_hay_sesion';
export const OAUTH_STATE_COOKIE = 'dx_oauth_state';
export const OAUTH_RETURN_COOKIE = 'dx_oauth_return';
const SESSION_DAYS = 30;

function newSessionId() {
  return crypto.randomUUID() + crypto.randomUUID();
}

export async function createSession(env, user) {
  const gate = await checkQuota(env, 'kv_writes');
  if (!gate.allowed) throw new QuotaExceededError('kv_writes');

  const id = newSessionId();
  await env.SESSIONS.put(`sess:${id}`, JSON.stringify(user), {
    expirationTtl: SESSION_DAYS * 24 * 60 * 60,
  });
  await addUsage(env, 'kv_writes', 1);
  return id;
}

export async function destroySession(env, sessionId) {
  const gate = await checkQuota(env, 'kv_deletes');
  if (!gate.allowed) throw new QuotaExceededError('kv_deletes');

  await env.SESSIONS.delete(`sess:${sessionId}`);
  await addUsage(env, 'kv_deletes', 1);
}

export async function getUserFromSession(env, sessionId) {
  if (!sessionId) return null;
  const gate = await checkQuota(env, 'kv_reads');
  if (!gate.allowed) throw new QuotaExceededError('kv_reads');

  const raw = await env.SESSIONS.get(`sess:${sessionId}`);
  await addUsage(env, 'kv_reads', 1);
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
