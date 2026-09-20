import {
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../../backend/lib/adminGuard.js';
import { d1First, d1Run } from '../../../../backend/lib/db.js';

const STATUSES = new Set(['no_iniciado', 'en_proceso', 'en_espera', 'terminado']);
const EDITABLE_FIELDS = ['title', 'description', 'system', 'status', 'assignee_id', 'repo', 'blocked_note'];

export const onRequestPatch = withQuotaHandling(async (context) => {
  const { request, env, params } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'devzone.manage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const existing = await d1First(env, `SELECT id FROM devzone_tasks WHERE id = ?`, [params.id]);
  if (!existing) return jsonResponse({ error: 'Tarea no encontrada.' }, 404);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return jsonResponse({ error: 'Cuerpo inválido.' }, 400);

  if (body.status !== undefined && !STATUSES.has(body.status)) {
    return jsonResponse({ error: 'Estado inválido.' }, 400);
  }
  if (body.title !== undefined && (!body.title.trim() || body.title.length > 160)) {
    return jsonResponse({ error: 'Título inválido.' }, 400);
  }

  const sets = [];
  const values = [];
  for (const field of EDITABLE_FIELDS) {
    if (body[field] === undefined) continue;
    sets.push(`${field} = ?`);
    values.push(field === 'assignee_id' && !body[field] ? null : body[field]);
  }
  if (!sets.length) return jsonResponse({ error: 'Nada para actualizar.' }, 400);

  sets.push(`updated_at = datetime('now')`);
  values.push(params.id);

  await d1Run(env, `UPDATE devzone_tasks SET ${sets.join(', ')} WHERE id = ?`, values);
  const task = await d1First(env, `SELECT * FROM devzone_tasks WHERE id = ?`, [params.id]);
  return jsonResponse({ task });
});

export const onRequestDelete = withQuotaHandling(async (context) => {
  const { request, env, params } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'devzone.manage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  await d1Run(env, `DELETE FROM devzone_tasks WHERE id = ?`, [params.id]);
  return jsonResponse({ ok: true });
});
