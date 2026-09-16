import {
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../../backend/lib/adminGuard.js';
import { d1Run, d1First } from '../../../../backend/lib/db.js';
import { purgeEdgeCache } from '../../../../backend/lib/edgeCache.js';

const SLUG_RE = /^[a-z0-9-]+$/;

function slugify(title) {
  return (title || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function validateAnnouncement(body) {
  const title = (body?.title || '').trim();
  const text = (body?.body || '').trim();
  const pinned = body?.pinned ? 1 : 0;
  const category = (body?.category || '').trim() || 'Anuncio';
  const excerpt = (body?.excerpt || '').trim();
  const heroImageUrl = (body?.hero_image_url || '').trim();

  if (!title || title.length > 140) return { error: 'Título inválido.' };
  if (!text) return { error: 'El contenido no puede estar vacío.' };
  if (text.length > 50000) {
    return { error: `El contenido es demasiado largo (${text.length} caracteres, máx. 50000). Si pegaste una imagen directamente, quítala y súbela con el botón de imagen.` };
  }
  if (category.length > 40) return { error: 'Categoría inválida.' };
  if (excerpt.length > 220) return { error: 'Extracto demasiado largo.' };
  if (heroImageUrl && !heroImageUrl.startsWith('http')) {
    return { error: 'La imagen de portada debe ser una URL válida.' };
  }

  let slug = (body?.slug || '').trim();
  if (slug) {
    if (!SLUG_RE.test(slug)) {
      return { error: 'Slug inválido (usa minúsculas, números y guiones).' };
    }
  } else {
    slug = slugify(title);
  }

  return {
    value: {
      title,
      body: text,
      pinned,
      category,
      excerpt,
      hero_image_url: heroImageUrl,
      slug,
    },
  };
}

export const onRequestPatch = withQuotaHandling(async (context) => {
  const { request, env, params } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'announcements.manage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const announcementId = Number(params.id);
  if (!Number.isInteger(announcementId)) return jsonResponse({ error: 'Anuncio inválido.' }, 400);

  const existing = await d1First(env, `SELECT id, slug FROM announcements WHERE id = ?`, [announcementId]);
  if (!existing) return jsonResponse({ error: 'Anuncio no encontrado.' }, 404);

  const body = await request.json().catch(() => null);
  const parsed = validateAnnouncement(body);
  if (parsed.error) return jsonResponse({ error: parsed.error }, 400);
  const { title, body: text, pinned, category, excerpt, hero_image_url, slug } = parsed.value;

  if (slug) {
    const dupe = await d1First(
      env,
      `SELECT id FROM announcements WHERE slug = ? AND id != ?`,
      [slug, announcementId]
    );
    if (dupe) return jsonResponse({ error: 'Ya existe un anuncio con ese slug.' }, 409);
  }

  await d1Run(
    env,
    `UPDATE announcements
     SET title = ?, body = ?, pinned = ?, slug = ?, excerpt = ?, hero_image_url = ?, category = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [title, text, pinned, slug || null, excerpt, hero_image_url || null, category, announcementId]
  );

  const announcement = await d1First(env, `SELECT * FROM announcements WHERE id = ?`, [announcementId]);

  const origin = new URL(request.url).origin;
  const purgeUrls = new Set([`${origin}/api/announcements`]);
  if (existing.slug) purgeUrls.add(`${origin}/anuncios/${existing.slug}`);
  if (slug) purgeUrls.add(`${origin}/anuncios/${slug}`);
  await purgeEdgeCache(context, [...purgeUrls]);

  return jsonResponse({ announcement });
});

export const onRequestDelete = withQuotaHandling(async (context) => {
  const { request, env, params } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'announcements.manage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const announcementId = Number(params.id);
  if (!Number.isInteger(announcementId)) return jsonResponse({ error: 'Anuncio inválido.' }, 400);

  const existing = await d1First(env, `SELECT id, slug FROM announcements WHERE id = ?`, [announcementId]);
  if (!existing) return jsonResponse({ error: 'Anuncio no encontrado.' }, 404);

  await d1Run(env, `DELETE FROM announcements WHERE id = ?`, [announcementId]);

  const origin = new URL(request.url).origin;
  const purgeUrls = [`${origin}/api/announcements`];
  if (existing.slug) purgeUrls.push(`${origin}/anuncios/${existing.slug}`);
  await purgeEdgeCache(context, purgeUrls);

  return jsonResponse({ ok: true });
});
