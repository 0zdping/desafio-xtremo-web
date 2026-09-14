import { withQuotaHandling, jsonResponse } from '../../../backend/lib/http.js';
import { cachedPublicJson } from '../../../backend/lib/edgeCache.js';
import { d1First } from '../../../backend/lib/db.js';

export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env, params } = context;

  const result = await cachedPublicJson(context, request.url, 120, async () => {
    const page = await d1First(
      env,
      `SELECT slug, title, category, content, updated_at FROM wiki_pages WHERE slug = ?`,
      [params.slug]
    );
    return { page };
  });

  // cachedPublicJson always returns a 200; unwrap it here to give a proper
  // 404 for a missing slug without caching an error response.
  const body = await result.clone().json().catch(() => null);
  if (body && body.page === null) {
    return jsonResponse({ error: 'Página no encontrada.' }, 404);
  }
  return result;
});
