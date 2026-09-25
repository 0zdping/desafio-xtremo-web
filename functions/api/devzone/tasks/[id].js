import {
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../../backend/lib/adminGuard.js';
import { d1First, d1Run } from '../../../../backend/lib/db.js';
import { validateTaskFields } from '../../../../backend/lib/devzone.js';

function taskId(params) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export const onRequestPatch = withQuotaHandling(async (context) => {
  const { request, env, params } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'devzone.manage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const id = taskId(params);
  if (!id) return jsonResponse({ error: 'Tarea inválida.' }, 400);
  const existing = await d1First(env, `SELECT id FROM devzone_tasks WHERE id = ?`, [id]);
  if (!existing) return jsonResponse({ error: 'Tarea no encontrada.' }, 404);

  const body = await request.json().catch(() => null);
  const parsed = validateTaskFields(body, { partial: true });
  if (parsed.error) return jsonResponse({ error: parsed.error }, 400);

  // Column names come from the validator's fixed allowlist, never from the
  // request, so building the SET clause from them is safe.
  const fields = Object.keys(parsed.value);
  if (!fields.length) return jsonResponse({ error: 'Nada para actualizar.' }, 400);
  const sets = fields.map((f) => `${f} = ?`);
  const values = fields.map((f) => parsed.value[f]);
  sets.push(`updated_at = datetime('now')`);
  values.push(id);

  await d1Run(env, `UPDATE devzone_tasks SET ${sets.join(', ')} WHERE id = ?`, values);
  const task = await d1First(
    env,
    `SELECT t.*, u.username AS created_by_name FROM devzone_tasks t LEFT JOIN users u ON u.id = t.created_by WHERE t.id = ?`,
    [id]
  );
  return jsonResponse({ task });
});

export const onRequestDelete = withQuotaHandling(async (context) => {
  const { request, env, params } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'devzone.manage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const id = taskId(params);
  if (!id) return jsonResponse({ error: 'Tarea inválida.' }, 400);
  const existing = await d1First(env, `SELECT id FROM devzone_tasks WHERE id = ?`, [id]);
  if (!existing) return jsonResponse({ error: 'Tarea no encontrada.' }, 404);

  await d1Run(env, `DELETE FROM devzone_tasks WHERE id = ?`, [id]);
  return jsonResponse({ ok: true });
});
