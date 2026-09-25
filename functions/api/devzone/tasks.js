import {
  requirePermission,
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../backend/lib/adminGuard.js';
import { d1Select, d1Run, d1First } from '../../../backend/lib/db.js';
import { validateTaskFields } from '../../../backend/lib/devzone.js';

export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermission(request, env, 'devzone.access');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const tasks = await d1Select(
    env,
    `SELECT t.*, u.username AS created_by_name
     FROM devzone_tasks t LEFT JOIN users u ON u.id = t.created_by
     ORDER BY t.updated_at DESC`
  );
  return jsonResponse({ tasks });
});

export const onRequestPost = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'devzone.manage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const body = await request.json().catch(() => null);
  const parsed = validateTaskFields(body, { partial: false });
  if (parsed.error) return jsonResponse({ error: parsed.error }, 400);
  const v = parsed.value;

  const insert = await d1Run(
    env,
    `INSERT INTO devzone_tasks (title, description, system, status, assignee_id, repo, blocked_note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      v.title,
      v.description || '',
      v.system || 'general',
      v.status || 'no_iniciado',
      v.assignee_id || null,
      v.repo || '',
      v.blocked_note || '',
      guard.user.id,
    ]
  );
  const task = await d1First(
    env,
    `SELECT t.*, u.username AS created_by_name FROM devzone_tasks t LEFT JOIN users u ON u.id = t.created_by WHERE t.id = ?`,
    [insert.meta.last_row_id]
  );
  return jsonResponse({ task }, 201);
});
