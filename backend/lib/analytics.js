/** Cookieless visitor fingerprint: SHA-256(ip|ua|day|salt), truncated. Never
 *  stored anywhere reversible and rotates every day, so it can't be used to
 *  track a person across days or sites, which is good enough to count "unique
 *  visitors" without a tracking cookie or a consent banner. */
export async function visitorHash(env, request) {
  const ip = request.headers.get('cf-connecting-ip') || '0.0.0.0';
  const ua = request.headers.get('user-agent') || '';
  const day = new Date().toISOString().slice(0, 10);
  const salt = env.ANALYTICS_SALT || 'dx-analytics-default-salt';
  const data = new TextEncoder().encode(`${ip}|${ua}|${day}|${salt}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

export function parseDevice(ua) {
  return /Mobi|Android|iPhone|iPad/i.test(ua || '') ? 'mobile' : 'desktop';
}

/** Reduces a referrer URL down to a bare hostname (never the full URL, which
 *  could carry a search query or other identifying bits) and folds our own
 *  domain into 'direct' since that's just in-site navigation, not a real
 *  external referrer. */
export function normalizeReferrer(rawReferrer, requestUrl) {
  if (!rawReferrer) return 'direct';
  try {
    const refHost = new URL(rawReferrer).hostname;
    const ownHost = new URL(requestUrl).hostname;
    if (!refHost || refHost === ownHost) return 'direct';
    return refHost.slice(0, 100);
  } catch (err) {
    return 'direct';
  }
}

export function sanitizePath(path) {
  const s = String(path || '/').slice(0, 200);
  return s.startsWith('/') ? s : '/' + s;
}

export function sanitizeTarget(target) {
  if (!target) return null;
  return String(target).slice(0, 150) || null;
}
