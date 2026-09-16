import {
  requirePermission,
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../backend/lib/adminGuard.js';
import { d1Select, d1Run, d1First } from '../../../backend/lib/db.js';
import { purgeEdgeCache } from '../../../backend/lib/edgeCache.js';

const SLUG_RE = /^[a-z0-9-]+$/;

function validatePage(body) {
  const slug = (body?.slug || '').trim();
  const title = (body?.title || '').trim();
  const category = (body?.category || '').trim() || 'General';
  const content = typeof body?.content === 'string' ? body.content : '';
  const position = Number.isFinite(body?.position) ? Math.trunc(body.position) : 0;

  if (!slug || slug.length > 60 || !SLUG_RE.test(slug)) {
    return { error: 'Slug inválido (solo minúsculas, números y guiones, máx. 60 caracteres).' };
  }
  if (!title || title.length > 120) return { error: 'Título inválido.' };
  if (category.length > 60) return { error: 'Categoría inválida.' };

  return { value: { slug, title, category, content, position } };
}

export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermission(request, env, 'panel.access');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const pages = await d1Select(env, `SELECT * FROM wiki_pages ORDER BY category, position, title`);
  return jsonResponse({ pages });
});

export const onRequestPost = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'wiki.manage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const body = await request.json().catch(() => null);
  const parsed = validatePage(body);
  if (parsed.error) return jsonResponse({ error: parsed.error }, 400);
  const { slug, title, category, content, position } = parsed.value;

  const dupe = await d1First(env, `SELECT id FROM wiki_pages WHERE slug = ?`, [slug]);
  if (dupe) return jsonResponse({ error: 'Ya existe una página con ese slug.' }, 409);

  const insert = await d1Run(
    env,
    `INSERT INTO wiki_pages (slug, title, category, content, position, updated_by) VALUES (?, ?, ?, ?, ?, ?)`,
    [slug, title, category, content, position, guard.user.id]
  );

  const page = await d1First(env, `SELECT * FROM wiki_pages WHERE id = ?`, [insert.meta.last_row_id]);

  const origin = new URL(request.url).origin;
  await purgeEdgeCache(context, [`${origin}/api/wiki`, `${origin}/api/wiki/${slug}`]);

  return jsonResponse({ page }, 201);
});
