import {
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../../../../backend/lib/adminGuard.js';
import { d1Run } from '../../../../../../backend/lib/db.js';

export const onRequestDelete = withQuotaHandling(async (context) => {
  const { request, env, params } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'panel.manage_roles');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const userId = params.id;
  const roleId = Number(params.roleId);
  if (!Number.isInteger(roleId)) return jsonResponse({ error: 'Rango inválido.' }, 400);

  await d1Run(env, `DELETE FROM user_roles WHERE user_id = ? AND role_id = ?`, [userId, roleId]);
  return jsonResponse({ ok: true });
});
