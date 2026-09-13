import { requirePermission, jsonResponse, withQuotaHandling } from '../../../backend/lib/adminGuard.js';
import { d1Select } from '../../../backend/lib/db.js';

export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermission(request, env, 'panel.access');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const permissions = await d1Select(env, `SELECT id, key, label, description FROM permissions ORDER BY key`);
  return jsonResponse({ permissions });
});
