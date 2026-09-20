import { requirePermission, jsonResponse, withQuotaHandling } from '../../../backend/lib/adminGuard.js';
import { d1Select } from '../../../backend/lib/db.js';

export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermission(request, env, 'devzone.access');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const specs = await d1Select(
    env,
    `SELECT id, slug, title, system, updated_at FROM devzone_specs ORDER BY system, title`
  );
  return jsonResponse({ specs });
});
