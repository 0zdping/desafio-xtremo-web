// GET  /api/launcher/staff/reportes: reportes de jugadores (abiertos primero).
// POST /api/launcher/staff/reportes {id, estado}: marcarlo como revisado o descartado.
import { withQuotaHandling, jsonResponse } from '../../../../backend/lib/http.js';
import { d1Select, d1Run } from '../../../../backend/lib/db.js';
import { leerJson } from '../../../../backend/lib/launcherHttp.js';
import { conStaff } from '../../../../backend/lib/launcherStaff.js';

export const onRequestGet = withQuotaHandling(async ({ request, env }) => {
  const { error } = await conStaff(request, env, 'sanctions.access');
  if (error) return error;
  const reportes = await d1Select(
    env,
    `SELECT id, autor_nombre, objetivo, motivo, detalle, estado, revisado_por, revisado_at, created_at FROM reportes
     WHERE estado = 'abierto' OR created_at > datetime('now', '-14 days')
     ORDER BY (estado = 'abierto') DESC, created_at DESC LIMIT 60`
  );
  return jsonResponse({ reportes, abiertos: reportes.filter((r) => r.estado === 'abierto').length });
});

export const onRequestPost = withQuotaHandling(async ({ request, env }) => {
  const { u, error } = await conStaff(request, env, 'sanctions.access');
  if (error) return error;
  const { datos } = await leerJson(request);
  if (!datos || !Number.isInteger(datos.id) || !['revisado', 'descartado', 'abierto'].includes(datos.estado)) {
    return jsonResponse({ error: 'Datos no válidos.' }, 400);
  }
  await d1Run(env, `UPDATE reportes SET estado = ?, revisado_por = ?, revisado_at = datetime('now') WHERE id = ?`,
    [datos.estado, u.username, datos.id]);
  return jsonResponse({ ok: true });
});
