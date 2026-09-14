import { requirePermission, jsonResponse, withQuotaHandling } from '../../../../backend/lib/adminGuard.js';
import { d1First } from '../../../../backend/lib/db.js';
import { getEvidenceObject } from '../../../../backend/lib/r2Evidence.js';

export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env, params } = context;
  const guard = await requirePermission(request, env, 'sanctions.access');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const row = await d1First(
    env,
    `SELECT r2_key, content_type, filename FROM sanction_evidence WHERE id = ?`,
    [params.id]
  );
  if (!row) return jsonResponse({ error: 'No encontrada.' }, 404);

  const obj = await getEvidenceObject(env, row.r2_key);
  if (!obj) return jsonResponse({ error: 'No encontrada.' }, 404);

  return new Response(obj.body, {
    headers: {
      'Content-Type': row.content_type || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${encodeURIComponent(row.filename || 'evidencia')}"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
});
