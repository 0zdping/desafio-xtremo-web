/** Only same-site relative paths are allowed as post-login destinations.
 *  Parsing with the URL API (instead of string checks) catches the tricks a
 *  browser would normalize into another origin: "/\evil.com", "/%09/evil.com",
 *  "//evil.com", "https://evil.com". Backslashes and control characters are
 *  rejected outright, so the value can never break the Location header. */
const BASE = 'https://return.invalid';
const UNSAFE_CHARS = /[\\\x00-\x1f\x7f]/;

export function safeReturnPath(raw) {
  const fallback = '/';
  if (!raw || typeof raw !== 'string' || raw.length > 500) return fallback;
  if (!raw.startsWith('/') || UNSAFE_CHARS.test(raw)) return fallback;
  try {
    const u = new URL(raw, BASE);
    if (u.origin !== BASE) return fallback;
    return u.pathname + u.search + u.hash;
  } catch (err) {
    return fallback;
  }
}
