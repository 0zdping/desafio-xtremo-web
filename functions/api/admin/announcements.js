import {
  requirePermission,
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../backend/lib/adminGuard.js';
import { d1Select, d1Run, d1First } from '../../../backend/lib/db.js';

function validateAnnouncement(body) {
  const title = (body?.title || '').trim();
  const text = (body?.body || '').trim();
  const pinned = body?.pinned ? 1 : 0;

  if (!title || title.length > 140) return { error: 'Título inválido.' };
  if (!text || text.length > 8000) return { error: 'Contenido inválido.' };

  return { value: { title, body: text, pinned } };
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
  const parsed = validateAnnouncement(body);
  if (parsed.error) return jsonResponse({ error: parsed.error }, 400);
  const { title, body: text, pinned } = parsed.value;

  const insert = await d1Run(
    env,
    `INSERT INTO announcements (title, body, pinned, author_id) VALUES (?, ?, ?, ?)`,
    [title, text, pinned, guard.user.id]
  );

  const announcement = await d1First(env, `SELECT * FROM announcements WHERE id = ?`, [insert.meta.last_row_id]);
  return jsonResponse({ announcement }, 201);
});
