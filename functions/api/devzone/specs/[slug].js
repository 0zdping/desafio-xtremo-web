import {
  requirePermission,
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../../backend/lib/adminGuard.js';
import { d1First, d1Run } from '../../../../backend/lib/db.js';
import { stripDangerousHtml } from '../../../../backend/lib/sanitizeHtml.js';

const SLUG_RE = /^[a-z0-9-]+$/;

export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env, params } = context;
  const guard = await requirePermission(request, env, 'devzone.access');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const spec = await d1First(env, `SELECT * FROM devzone_specs WHERE slug = ?`, [params.slug]);
  if (!spec) return jsonResponse({ error: 'Spec no encontrada.' }, 404);
  return jsonResponse({ spec });
});

// Upsert: crea la spec si el slug no existe, la actualiza si ya existe. Una
// spec por sistema no necesita un endpoint de creación separado.
export const onRequestPut = withQuotaHandling(async (context) => {
  const { request, env, params } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'devzone.manage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const slug = params.slug;
  if (!slug || slug.length > 60 || !SLUG_RE.test(slug)) {
    return jsonResponse({ error: 'Slug inválido (solo minúsculas, números y guiones).' }, 400);
  }

  const body = await request.json().catch(() => null);
  const title = (body?.title || '').trim();
  const system = (body?.system || 'general').trim() || 'general';
  const sourceNote = (body?.source_note || '').trim();
  const rawContent = typeof body?.content === 'string' ? body.content : '';

  if (!title || title.length > 120) return jsonResponse({ error: 'Título inválido.' }, 400);
  if (system.length > 40) return jsonResponse({ error: 'Sistema inválido.' }, 400);
  if (sourceNote.length > 200) return jsonResponse({ error: 'Nota de origen demasiado larga.' }, 400);

  const content = await stripDangerousHtml(rawContent);

  const existing = await d1First(env, `SELECT id FROM devzone_specs WHERE slug = ?`, [slug]);
  if (existing) {
    await d1Run(
      env,
      `UPDATE devzone_specs SET title=?, system=?, content=?, source_note=?, updated_by=?, updated_at=datetime('now') WHERE slug=?`,
      [title, system, content, sourceNote, guard.user.id, slug]
    );
  } else {
    await d1Run(
      env,
      `INSERT INTO devzone_specs (slug, title, system, content, source_note, updated_by) VALUES (?, ?, ?, ?, ?, ?)`,
      [slug, title, system, content, sourceNote, guard.user.id]
    );
  }

  const spec = await d1First(env, `SELECT * FROM devzone_specs WHERE slug = ?`, [slug]);
  return jsonResponse({ spec });
});
