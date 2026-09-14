import {
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../../backend/lib/adminGuard.js';
import { d1Select } from '../../../../backend/lib/db.js';

/** Deletes R2 objects under posts/ that aren't referenced by any
 *  announcement (hero image or an <img> embedded in the body) anymore —
 *  leftovers from posts deleted before delete cleaned up their images, or
 *  from edits that replaced an image. Nothing outside the MEDIA bucket
 *  (e.g. the static homepage banner in frontend/assets) is ever touched.
 *  POST ?dry=1 to preview without deleting anything. */
export const onRequestPost = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'announcements.manage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  if (!env.MEDIA || !env.MEDIA_PUBLIC_URL) {
    return jsonResponse({ error: 'El almacenamiento de imágenes no está configurado.' }, 500);
  }

  const rows = await d1Select(env, `SELECT hero_image_url, body FROM announcements`, []);
  const referenced = new Set();
  for (const r of rows) {
    if (r.hero_image_url) referenced.add(r.hero_image_url);
    if (r.body) {
      for (const m of r.body.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
        referenced.add(m[1]);
      }
    }
  }

  const base = env.MEDIA_PUBLIC_URL.replace(/\/+$/, '');
  const toDelete = [];
  const kept = [];
  let cursor;
  do {
    const listing = await env.MEDIA.list({ prefix: 'posts/', cursor });
    for (const obj of listing.objects) {
      const url = `${base}/${obj.key}`;
      if (referenced.has(url)) kept.push(obj.key);
      else toDelete.push(obj.key);
    }
    cursor = listing.truncated ? listing.cursor : undefined;
  } while (cursor);

  const dryRun = new URL(request.url).searchParams.get('dry') === '1';
  if (!dryRun) {
    for (const key of toDelete) {
      await env.MEDIA.delete(key);
    }
  }

  return jsonResponse({
    dryRun,
    deletedCount: toDelete.length,
    deleted: toDelete,
    keptCount: kept.length,
    kept,
  });
});
