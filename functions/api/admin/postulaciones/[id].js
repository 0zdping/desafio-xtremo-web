// Panel: decidir una postulación.
//   PATCH /api/admin/postulaciones/:id   { estado?, respuesta?, nota_interna? }
import { requirePermissionAndCsrf, jsonResponse, withQuotaHandling } from '../../../../backend/lib/adminGuard.js';
import { d1First, d1Run } from '../../../../backend/lib/db.js';
import { ESTADOS } from '../../../../backend/lib/postulaciones.js';

export const onRequestPatch = withQuotaHandling(async ({ request, env, params }) => {
  const guard = await requirePermissionAndCsrf(request, env, 'postulaciones.review');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return jsonResponse({ error: 'Id no válido.' }, 400);
  const actual = await d1First(env, `SELECT id FROM postulaciones WHERE id = ?`, [id]);
  if (!actual) return jsonResponse({ error: 'No existe.' }, 404);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return jsonResponse({ error: 'Cuerpo inválido.' }, 400);
  const sets = [];
  const vals = [];
  if (body.estado !== undefined) {
    if (!ESTADOS.includes(body.estado)) return jsonResponse({ error: 'Estado no válido.' }, 400);
    sets.push('estado = ?'); vals.push(body.estado);
  }
  for (const [campo, max] of [['respuesta', 1000], ['nota_interna', 2000]]) {
    if (body[campo] === undefined) continue;
    if (typeof body[campo] !== 'string' || body[campo].length > max) return jsonResponse({ error: `"${campo}" no válido (máx. ${max}).` }, 400);
    sets.push(`${campo} = ?`); vals.push(body[campo].trim());
  }
  if (!sets.length) return jsonResponse({ error: 'Nada que cambiar.' }, 400);
  sets.push('revisado_por = ?', `updated_at = datetime('now')`);
  vals.push(guard.user.id, id);
  try {
    await d1Run(env, `UPDATE postulaciones SET ${sets.join(', ')} WHERE id = ?`, vals);
  } catch (err) {
    if (/UNIQUE/i.test(String(err && err.message))) return jsonResponse({ error: 'Esa persona ya tiene otra postulación activa a este puesto.' }, 409);
    throw err;
  }
  return jsonResponse({ ok: true });
});
