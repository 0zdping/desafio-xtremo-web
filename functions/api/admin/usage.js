import { requirePermission, jsonResponse, withQuotaHandling } from '../../../backend/lib/adminGuard.js';
import { getUsageSnapshot } from '../../../backend/lib/quota.js';

export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermission(request, env, 'panel.view_usage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const usage = await getUsageSnapshot(env);
  return jsonResponse({ usage });
});
