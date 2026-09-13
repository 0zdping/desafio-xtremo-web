/** Rate limiting sencillo de ventana fija sobre KV. No es perfecto bajo
 *  concurrencia muy alta, pero alcanza de sobra para esta web y no cuesta
 *  nada extra dentro de la capa gratuita de Cloudflare. */
export async function rateLimit(env, key, limit, windowSeconds) {
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const fullKey = `rl:${key}:${bucket}`;

  const current = await env.SESSIONS.get(fullKey);
  const count = current ? parseInt(current, 10) : 0;

  if (count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  await env.SESSIONS.put(fullKey, String(count + 1), { expirationTtl: windowSeconds + 5 });
  return { allowed: true, remaining: limit - count - 1 };
}

export function clientIp(req) {
  return req.headers.get('cf-connecting-ip') ?? 'unknown';
}
