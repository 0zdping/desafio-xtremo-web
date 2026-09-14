import { withQuotaHandling } from '../../backend/lib/http.js';
import { cachedPublicJson } from '../../backend/lib/edgeCache.js';
import { d1Select } from '../../backend/lib/db.js';

export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env } = context;
  return cachedPublicJson(context, request.url, 120, async () => {
    const announcements = await d1Select(
      env,
      `SELECT id, title, body, pinned, created_at, updated_at, slug, excerpt, hero_image_url, category, views FROM announcements ORDER BY pinned DESC, created_at DESC LIMIT 50`
    );
    return { announcements };
  });
});
