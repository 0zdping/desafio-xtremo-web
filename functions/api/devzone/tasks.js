import {
  requirePermission,
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../backend/lib/adminGuard.js';
import { d1Select, d1Run, d1First } from '../../../backend/lib/db.js';

const STATUSES = new Set(['no_iniciado', 'en_proceso', 'en_espera', 'terminado']);

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
  const title = (body?.title || '').trim();
  const description = (body?.description || '').trim();
  const system = (body?.system || 'general').trim() || 'general';
  const status = STATUSES.has(body?.status) ? body.status : 'no_iniciado';
  const assigneeId = body?.assignee_id ? String(body.assignee_id).trim() : null;
  const repo = (body?.repo || '').trim();
  const blockedNote = (body?.blocked_note || '').trim();

  if (!title || title.length > 160) return jsonResponse({ error: 'Título inválido.' }, 400);
  if (description.length > 4000) return jsonResponse({ error: 'Descripción demasiado larga.' }, 400);
  if (system.length > 40) return jsonResponse({ error: 'Sistema inválido.' }, 400);

  const insert = await d1Run(
    env,
    `INSERT INTO devzone_tasks (title, description, system, status, assignee_id, repo, blocked_note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description, system, status, assigneeId, repo, blockedNote, guard.user.id]
  );
  const task = await d1First(env, `SELECT * FROM devzone_tasks WHERE id = ?`, [insert.meta.last_row_id]);
  return jsonResponse({ task }, 201);
});
