import {
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../../backend/lib/adminGuard.js';
import { d1Run, d1First } from '../../../../backend/lib/db.js';

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

export const onRequestPatch = withQuotaHandling(async (context) => {
  const { request, env, params } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'wiki.manage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const pageId = Number(params.id);
  if (!Number.isInteger(pageId)) return jsonResponse({ error: 'Página inválida.' }, 400);

  const existing = await d1First(env, `SELECT id FROM wiki_pages WHERE id = ?`, [pageId]);
  if (!existing) return jsonResponse({ error: 'Página no encontrada.' }, 404);

  const body = await request.json().catch(() => null);
  const parsed = validatePage(body);
  if (parsed.error) return jsonResponse({ error: parsed.error }, 400);
  const { slug, title, category, content, position } = parsed.value;

  const dupe = await d1First(env, `SELECT id FROM wiki_pages WHERE slug = ? AND id != ?`, [slug, pageId]);
  if (dupe) return jsonResponse({ error: 'Ya existe una página con ese slug.' }, 409);

  await d1Run(
    env,
    `UPDATE wiki_pages SET slug = ?, title = ?, category = ?, content = ?, position = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?`,
    [slug, title, category, content, position, guard.user.id, pageId]
  );

  const page = await d1First(env, `SELECT * FROM wiki_pages WHERE id = ?`, [pageId]);
  return jsonResponse({ page });
});

export const onRequestDelete = withQuotaHandling(async (context) => {
  const { request, env, params } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'wiki.manage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const pageId = Number(params.id);
  if (!Number.isInteger(pageId)) return jsonResponse({ error: 'Página inválida.' }, 400);

  const existing = await d1First(env, `SELECT id FROM wiki_pages WHERE id = ?`, [pageId]);
  if (!existing) return jsonResponse({ error: 'Página no encontrada.' }, 404);

  await d1Run(env, `DELETE FROM wiki_pages WHERE id = ?`, [pageId]);
  return jsonResponse({ ok: true });
});
