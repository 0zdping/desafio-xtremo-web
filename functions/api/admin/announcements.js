import {
  requirePermission,
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../backend/lib/adminGuard.js';
import { d1Select, d1Run, d1First } from '../../../backend/lib/db.js';
import { purgeEdgeCache } from '../../../backend/lib/edgeCache.js';
import { sanitizeHtml } from '../../../backend/lib/sanitizeHtml.js';

const SLUG_RE = /^[a-z0-9-]+$/;

function slugify(title) {
  return (title || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function validateAnnouncement(body) {
  const title = (body?.title || '').trim();
  const rawText = (body?.body || '').trim();
  const pinned = body?.pinned ? 1 : 0;
  const category = (body?.category || '').trim() || 'Anuncio';
  const excerpt = (body?.excerpt || '').trim();
  const heroImageUrl = (body?.hero_image_url || '').trim();

  if (!title || title.length > 140) return { error: 'Título inválido.' };
  if (!rawText) return { error: 'El contenido no puede estar vacío.' };

  // Server-side sanitization is the real security boundary here — the
  // client-side DOMPurify pass in admin.js is only advisory (it silently
  // no-ops if the CDN script fails to load, and a direct API call skips
  // the browser entirely). See backend/lib/sanitizeHtml.js.
  const text = await sanitizeHtml(rawText);
  if (!text || !text.replace(/<[^>]*>/g, '').trim()) {
    return { error: 'El contenido no puede estar vacío.' };
  }
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

export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermission(request, env, 'panel.access');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const announcements = await d1Select(
    env,
    `SELECT * FROM announcements ORDER BY pinned DESC, created_at DESC`
  );
  return jsonResponse({ announcements });
});

export const onRequestPost = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'announcements.manage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const body = await request.json().catch(() => null);
  const parsed = await validateAnnouncement(body);
  if (parsed.error) return jsonResponse({ error: parsed.error }, 400);
  const { title, body: text, pinned, category, excerpt, hero_image_url, slug } = parsed.value;

  if (slug) {
    const dupe = await d1First(env, `SELECT id FROM announcements WHERE slug = ?`, [slug]);
    if (dupe) return jsonResponse({ error: 'Ya existe un anuncio con ese slug.' }, 409);
  }

  const insert = await d1Run(
    env,
    `INSERT INTO announcements (title, body, pinned, author_id, slug, excerpt, hero_image_url, category)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, text, pinned, guard.user.id, slug || null, excerpt, hero_image_url || null, category]
  );

  const announcement = await d1First(env, `SELECT * FROM announcements WHERE id = ?`, [insert.meta.last_row_id]);

  const origin = new URL(request.url).origin;
  const purgeUrls = [`${origin}/api/announcements`];
  if (slug) purgeUrls.push(`${origin}/anuncios/${slug}`);
  await purgeEdgeCache(context, purgeUrls);

  return jsonResponse({ announcement }, 201);
});
