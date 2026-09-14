import { withQuotaHandling } from '../../backend/lib/http.js';
import { cachedPublicJson } from '../../backend/lib/edgeCache.js';
import { d1Select } from '../../backend/lib/db.js';

export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env } = context;
  return cachedPublicJson(context, request.url, 120, async () => {
    const pages = await d1Select(
      env,
      `SELECT id, slug, title, category, position FROM wiki_pages ORDER BY category, position, title`
    );
    return { pages };
  });
});
