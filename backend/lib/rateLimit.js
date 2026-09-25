/** Rate limiting de ventana fija, en memoria del isolate.
 *
 *  Antes vivía en KV, pero eso costaba un KV.put() por cada petición
 *  limitada (una por cada visita, en /api/track), y KV solo permite 1.000
 *  escrituras al día en el plan gratuito. En memoria no cuesta nada; el
 *  precio es que el límite es por isolate y no global: un cliente cuyas
 *  peticiones caigan en varios isolates puede pasar algo más del límite.
 *  Para lo que protege (spam de analítica y de intentos de login) es de
 *  sobra, y nunca puede tumbar la petición que limita. */
const buckets = new Map(); // key -> { count, resetAt }
const MAX_KEYS = 10000;

export async function rateLimit(env, key, limit, windowSeconds) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
      if (buckets.size >= MAX_KEYS) buckets.clear();
    }
    b = { count: 0, resetAt: now + windowSeconds * 1000 };
    buckets.set(key, b);
  }
  if (b.count >= limit) return { allowed: false, remaining: 0 };
  b.count += 1;
  return { allowed: true, remaining: limit - b.count };
}

export function clientIp(req) {
  return req.headers.get('cf-connecting-ip') ?? 'unknown';
}
