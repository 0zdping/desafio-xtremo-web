// GET  /api/launcher/staff/reportes: reportes de jugadores (abiertos primero).
// POST /api/launcher/staff/reportes {id, estado?, respuesta?}: marcarlo como revisado, descartado
// o abierto, y/o responder a quien lo mandó (también si ya está resuelto). El autor lo ve en su
// launcher ("Tus reportes") con un aviso.
import { withQuotaHandling, jsonResponse } from '../../../../backend/lib/http.js';
import { d1Select, d1Run } from '../../../../backend/lib/db.js';
import { leerJson } from '../../../../backend/lib/launcherHttp.js';
import { conStaff } from '../../../../backend/lib/launcherStaff.js';

export const onRequestGet = withQuotaHandling(async ({ request, env }) => {
  const { error } = await conStaff(request, env, 'sanctions.access');
  if (error) return error;
  const reportes = await d1Select(
    env,
    `SELECT id, autor_nombre, objetivo, motivo, detalle, estado, revisado_por, revisado_at, respuesta, respuesta_por, respuesta_at, created_at
     FROM reportes
     WHERE estado = 'abierto' OR created_at > datetime('now', '-14 days')
     ORDER BY (estado = 'abierto') DESC, created_at DESC LIMIT 60`
  );
  return jsonResponse({ reportes, abiertos: reportes.filter((r) => r.estado === 'abierto').length });
});

export const onRequestPost = withQuotaHandling(async ({ request, env }) => {
  const { u, error } = await conStaff(request, env, 'sanctions.access');
  if (error) return error;
  const { datos } = await leerJson(request, 4000);
  const estado = datos && datos.estado;
  const tieneRespuesta = datos && typeof datos.respuesta === 'string';
  if (!datos || !Number.isInteger(datos.id) || (estado !== undefined && !['revisado', 'descartado', 'abierto'].includes(estado)) || (estado === undefined && !tieneRespuesta)) {
    return jsonResponse({ error: 'Datos no válidos.' }, 400);
  }
  const respuesta = tieneRespuesta ? datos.respuesta.trim().slice(0, 1000) : null;
  if (estado !== undefined) {
    // Al resolverlo, el autor tiene una novedad; al reabrirlo, no.
    await d1Run(env, `UPDATE reportes SET estado = ?, revisado_por = ?, revisado_at = datetime('now'), novedad = CASE WHEN ? = 'abierto' THEN novedad ELSE 1 END WHERE id = ?`,
      [estado, u.username, estado, datos.id]);
  }
  if (tieneRespuesta) {
    // Texto: se responde (y el autor tiene una novedad). Vacío: se borra la respuesta.
    if (respuesta) {
      await d1Run(env, `UPDATE reportes SET respuesta = ?, respuesta_por = ?, respuesta_at = datetime('now'), novedad = 1 WHERE id = ?`,
        [respuesta, u.username, datos.id]);
    } else {
      await d1Run(env, `UPDATE reportes SET respuesta = NULL, respuesta_por = NULL, respuesta_at = NULL WHERE id = ?`, [datos.id]);
    }
  }
  return jsonResponse({ ok: true });
});
