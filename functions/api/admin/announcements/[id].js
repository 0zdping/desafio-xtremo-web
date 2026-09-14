import {
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../../backend/lib/adminGuard.js';
import { d1Run, d1First } from '../../../../backend/lib/db.js';

function validateAnnouncement(body) {
  const title = (body?.title || '').trim();
  const text = (body?.body || '').trim();
  const pinned = body?.pinned ? 1 : 0;

  if (!title || title.length > 140) return { error: 'Título inválido.' };
  if (!text || text.length > 8000) return { error: 'Contenido inválido.' };

  return { value: { title, body: text, pinned } };
}

export const onRequestPatch = withQuotaHandling(async (context) => {
  const { request, env, params } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'announcements.manage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const announcementId = Number(params.id);
  if (!Number.isInteger(announcementId)) return jsonResponse({ error: 'Anuncio inválido.' }, 400);

  const existing = await d1First(env, `SELECT id FROM announcements WHERE id = ?`, [announcementId]);
  if (!existing) return jsonResponse({ error: 'Anuncio no encontrado.' }, 404);

  const body = await request.json().catch(() => null);
  const parsed = validateAnnouncement(body);
  if (parsed.error) return jsonResponse({ error: parsed.error }, 400);
  const { title, body: text, pinned } = parsed.value;

  await d1Run(
    env,
    `UPDATE announcements SET title = ?, body = ?, pinned = ?, updated_at = datetime('now') WHERE id = ?`,
    [title, text, pinned, announcementId]
  );

  const announcement = await d1First(env, `SELECT * FROM announcements WHERE id = ?`, [announcementId]);
  return jsonResponse({ announcement });
});

export const onRequestDelete = withQuotaHandling(async (context) => {
  const { request, env, params } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'announcements.manage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const announcementId = Number(params.id);
  if (!Number.isInteger(announcementId)) return jsonResponse({ error: 'Anuncio inválido.' }, 400);

  const existing = await d1First(env, `SELECT id FROM announcements WHERE id = ?`, [announcementId]);
  if (!existing) return jsonResponse({ error: 'Anuncio no encontrado.' }, 404);

  await d1Run(env, `DELETE FROM announcements WHERE id = ?`, [announcementId]);
  return jsonResponse({ ok: true });
});
