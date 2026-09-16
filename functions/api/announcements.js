import { withQuotaHandling } from '../../backend/lib/http.js';
import { cachedPublicJson } from '../../backend/lib/edgeCache.js';
import { d1Select } from '../../backend/lib/db.js';

export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env } = context;
  return cachedPublicJson(context, request.url, 120, async () => {
    const announcements = await d1Select(
      env,
      `SELECT a.id, a.title, a.body, a.pinned, a.created_at, a.updated_at, a.slug, a.excerpt, a.hero_image_url, a.category, a.views,
              (SELECT COUNT(*) FROM announcement_likes l WHERE l.announcement_id = a.id) AS likes
       FROM announcements a ORDER BY a.pinned DESC, a.created_at DESC LIMIT 50`
    );
    return { announcements };
  });
});
