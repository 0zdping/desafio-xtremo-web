import {
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../../backend/lib/adminGuard.js';
import { d1Select, d1Run, d1First } from '../../../../backend/lib/db.js';

export const onRequestDelete = withQuotaHandling(async (context) => {
  const { request, env, params } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'sanctions.manage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const sanctionId = Number(params.id);
  if (!Number.isInteger(sanctionId)) return jsonResponse({ error: 'Sanción inválida.' }, 400);

  const existing = await d1First(env, `SELECT id FROM sanctions WHERE id = ?`, [sanctionId]);
  if (!existing) return jsonResponse({ error: 'Sanción no encontrada.' }, 404);

  const evidence = await d1Select(env, `SELECT r2_key FROM sanction_evidence WHERE sanction_id = ?`, [sanctionId]);
  for (const row of evidence) {
    try {
      await env.EVIDENCE?.delete(row.r2_key);
    } catch (err) {
      console.error('failed to delete evidence object from R2', row.r2_key, err);
    }
  }

  // ON DELETE CASCADE on sanction_evidence takes care of the DB rows.
  await d1Run(env, `DELETE FROM sanctions WHERE id = ?`, [sanctionId]);
  return jsonResponse({ ok: true });
});
