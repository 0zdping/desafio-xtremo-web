import { requirePermission, jsonResponse, withQuotaHandling } from '../../../backend/lib/adminGuard.js';
import { d1Select } from '../../../backend/lib/db.js';

/** People who can see Dev Zone (their role grants devzone.access), used to
 *  suggest assignees on the task board. Only public profile bits: id,
 *  Discord username and avatar URL. */
export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermission(request, env, 'devzone.access');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const members = await d1Select(
    env,
    `SELECT DISTINCT u.id, u.username, u.avatar
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN role_permissions rp ON rp.role_id = ur.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE p.key = 'devzone.access'
     ORDER BY u.username`
  );
  return jsonResponse({ members });
});
