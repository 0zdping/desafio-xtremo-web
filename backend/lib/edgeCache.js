import { jsonResponse } from './http.js';

/** Serves public GET JSON through Cloudflare's edge cache so repeat hits
 *  don't burn D1/KV quota. Falls back to computing (uncached) if the Cache
 *  API isn't available in this runtime — never lets a caching failure break
 *  the actual request. */
export async function cachedPublicJson(context, cacheKeyUrl, ttlSeconds, computeFn) {
  let cache = null;
  let cacheKey = null;
  try {
    cache = caches.default;
    cacheKey = new Request(cacheKeyUrl, context.request);
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  } catch (err) {
    cache = null;
  }

  const data = await computeFn();

  if (!cache) return jsonResponse(data);

  const res = jsonResponse(data, 200, { 'Cache-Control': `public, max-age=${ttlSeconds}` });
  try {
    context.waitUntil(cache.put(cacheKey, res.clone()));
  } catch (err) {
    // Caching failed — still return the freshly computed response.
  }
  return res;
}
