import { parseCookie, serializeCookie } from './cookies.js';

const CSRF_COOKIE = 'dx_csrf';

/** Patrón "double-submit cookie": la cookie NO es HttpOnly (el frontend
 *  necesita leerla) y su valor debe repetirse en la cabecera X-CSRF-Token
 *  en cada petición que modifique datos. */
export function ensureCsrfCookie(cookieHeader) {
  const existing = parseCookie(cookieHeader, CSRF_COOKIE);
  if (existing) return { token: existing, setCookie: null };

  const token = crypto.randomUUID().replace(/-/g, '');
  const setCookie = serializeCookie(CSRF_COOKIE, token, { httpOnly: false, maxAgeSeconds: 60 * 60 * 24 * 30 });
  return { token, setCookie };
}

export function verifyCsrf(cookieHeader, headerValue) {
  const cookieToken = parseCookie(cookieHeader, CSRF_COOKIE);
  if (!cookieToken || !headerValue) return false;
  return cookieToken === headerValue;
}
