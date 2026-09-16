import { requireAuthAndCsrf, jsonResponse, withQuotaHandling } from '../../../../backend/lib/authGuard.js';
import { d1Run, d1First } from '../../../../backend/lib/db.js';
import { purgeEdgeCache } from '../../../../backend/lib/edgeCache.js';

async function countLikes(env, announcementId) {
  const row = await d1First(env, `SELECT COUNT(*) AS n FROM announcement_likes WHERE announcement_id = ?`, [announcementId]);
  return row ? row.n : 0;
}

export const onRequestPost = withQuotaHandling(async (context) => {
  const { request, env, params } = context;
  const guard = await requireAuthAndCsrf(request, env);
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const announcementId = Number(params.id);
  if (!Number.isInteger(announcementId)) return jsonResponse({ error: 'Anuncio inválido.' }, 400);

  const post = await d1First(env, `SELECT id, slug FROM announcements WHERE id = ?`, [announcementId]);
  if (!post) return jsonResponse({ error: 'Anuncio no encontrado.' }, 404);

  const existing = await d1First(
    env,
    `SELECT 1 FROM announcement_likes WHERE announcement_id = ? AND user_id = ?`,
    [announcementId, guard.user.id]
  );

  if (existing) {
    await d1Run(env, `DELETE FROM announcement_likes WHERE announcement_id = ? AND user_id = ?`, [announcementId, guard.user.id]);
  } else {
    await d1Run(
      env,
      `INSERT INTO announcement_likes (announcement_id, user_id) VALUES (?, ?)`,
      [announcementId, guard.user.id]
    );
  }

  const likes = await countLikes(env, announcementId);

  const origin = new URL(request.url).origin;
  const purgeUrls = [`${origin}/api/announcements`];
  if (post.slug) purgeUrls.push(`${origin}/anuncios/${post.slug}`);
  await purgeEdgeCache(context, purgeUrls);

  return jsonResponse({ liked: !existing, likes });
});
