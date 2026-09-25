import { requirePermission, jsonResponse, withQuotaHandling } from '../../../backend/lib/adminGuard.js';
import { getUsageSnapshot } from '../../../backend/lib/quota.js';

export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermission(request, env, 'panel.view_usage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const { usage, tableMissing } = await getUsageSnapshot(env);
  return jsonResponse({
    usage,
    note: tableMissing
      ? 'Los contadores no están activos: falta aplicar la migración 0009_usage_counters.sql en D1. Mientras tanto el sitio funciona igual, pero sin este límite de seguridad.'
      : null,
  });
});
