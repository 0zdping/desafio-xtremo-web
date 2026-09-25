import {
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../../../../backend/lib/adminGuard.js';
import { d1Run, d1First } from '../../../../../../backend/lib/db.js';
import { roleChangeError } from '../../../../../../backend/lib/permissions.js';

const DISCORD_ID = /^\d{15,25}$/;

export const onRequestDelete = withQuotaHandling(async (context) => {
  const { request, env, params } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'panel.manage_roles');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const userId = params.id;
  const roleId = Number(params.roleId);
  if (!DISCORD_ID.test(String(userId))) return jsonResponse({ error: 'ID de Discord inválido.' }, 400);
  if (!Number.isInteger(roleId)) return jsonResponse({ error: 'Rango inválido.' }, 400);

  const role = await d1First(env, `SELECT id, is_locked, position FROM roles WHERE id = ?`, [roleId]);
  if (!role) return jsonResponse({ error: 'Rango no encontrado.' }, 404);
  const denied = await roleChangeError(env, guard, role, userId);
  if (denied) return jsonResponse({ error: denied }, 403);

  await d1Run(env, `DELETE FROM user_roles WHERE user_id = ? AND role_id = ?`, [userId, roleId]);
  return jsonResponse({ ok: true });
});
