import { withQuotaHandling } from '../../backend/lib/http.js';
import { d1Run } from '../../backend/lib/db.js';
import { visitorHash, parseDevice, normalizeReferrer, sanitizePath, sanitizeTarget } from '../../backend/lib/analytics.js';

const MAX_EVENTS_PER_BATCH = 15;
const TYPES = new Set(['pageview', 'click']);

// Analytics beacon: no auth, so every visitor can reach it. Batched client-side
// (frontend/js/analytics.js) into one request per flush instead of one per
// pageview/click — each request here is a single d1Run() call regardless of
// how many events it carries, which matters because every D1 operation also
// costs one write against the site's shared KV quota bookkeeping (see
// backend/lib/quota.js). One insert per visit instead of per interaction
// keeps that shared budget mostly for the rest of the site.
export const onRequestPost = withQuotaHandling(async (context) => {
  const { request, env } = context;

  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).hostname !== new URL(request.url).hostname) {
        return new Response(null, { status: 204 });
      }
    } catch (err) {
      return new Response(null, { status: 204 });
    }
  }

  const body = await request.json().catch(() => null);
  const events = Array.isArray(body?.events) ? body.events.slice(0, MAX_EVENTS_PER_BATCH) : [];
  const valid = events.filter((e) => e && TYPES.has(e.type));
  if (!valid.length) return new Response(null, { status: 204 });

  const hash = await visitorHash(env, request);
  const referrer = normalizeReferrer(body?.ref, request.url);
  const device = parseDevice(request.headers.get('user-agent'));
  const country = (request.cf && request.cf.country) || null;

  const rows = valid.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
  const params = [];
  for (const e of valid) {
    params.push(e.type, sanitizePath(e.path), sanitizeTarget(e.target), hash, referrer, device, country);
  }

  await d1Run(
    env,
    `INSERT INTO analytics_events (type, path, target, visitor_hash, referrer, device, country) VALUES ${rows}`,
    params
  );

  return new Response(null, { status: 204 });
});
