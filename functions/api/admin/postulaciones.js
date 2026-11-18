// Panel: postulaciones a Staff / Desarrollo.
//   GET /api/admin/postulaciones?estado=pendiente|en_revision|aceptada|rechazada|todas
import { requirePermission, jsonResponse, withQuotaHandling } from '../../../backend/lib/adminGuard.js';
import { d1Select } from '../../../backend/lib/db.js';
import { ESTADOS, leerPreguntas } from '../../../backend/lib/postulaciones.js';

export const onRequestGet = withQuotaHandling(async ({ request, env }) => {
  const guard = await requirePermission(request, env, 'postulaciones.review');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);
  const estado = new URL(request.url).searchParams.get('estado') || 'activas';
  let where = `p.estado IN ('pendiente','en_revision')`;
  const params = [];
  if (ESTADOS.includes(estado)) { where = 'p.estado = ?'; params.push(estado); }
  else if (estado === 'todas') where = '1=1';
  const filas = await d1Select(
    env,
    `SELECT p.id, p.user_id, u.username, u.avatar, p.puesto, p.respuestas, p.mc_nombre, p.estado, p.respuesta, p.nota_interna,
            p.revisado_por, r.username AS revisado_por_nombre, p.created_at, p.updated_at
     FROM postulaciones p LEFT JOIN users u ON u.id = p.user_id LEFT JOIN users r ON r.id = p.revisado_por
     WHERE ${where} ORDER BY p.created_at DESC LIMIT 200`,
    params
  );
  const postulaciones = filas.map((f) => ({ ...f, respuestas: leerPreguntas(f.respuestas) }));
  const cuentas = await d1Select(env, `SELECT estado, COUNT(*) AS n FROM postulaciones GROUP BY estado`);
  return jsonResponse({ postulaciones, cuentas: Object.fromEntries(cuentas.map((c) => [c.estado, c.n])) });
});
