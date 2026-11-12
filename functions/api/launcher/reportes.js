// GET  /api/launcher/reportes: los reportes que ha mandado la cuenta conectada, con su estado y la
//      respuesta del staff (últimos 90 días). novedades = cuántos tienen algo sin ver.
// POST /api/launcher/reportes {vistos: true}: los marca como vistos.
import { withQuotaHandling, jsonResponse } from '../../../backend/lib/http.js';
import { d1Select, d1Run } from '../../../backend/lib/db.js';
import { conLauncher, leerJson } from '../../../backend/lib/launcherHttp.js';

export const onRequestGet = withQuotaHandling(async ({ request, env }) => {
  const { u, error } = await conLauncher(request, env);
  if (error) return error;
  const reportes = await d1Select(
    env,
    `SELECT id, objetivo, motivo, detalle, estado, revisado_at, respuesta, respuesta_at, novedad, created_at
     FROM reportes WHERE autor_user_id = ? AND created_at > datetime('now', '-90 days')
     ORDER BY created_at DESC LIMIT 30`,
    [u.id]
  );
  return jsonResponse({ reportes, novedades: reportes.filter((r) => r.novedad).length });
});

export const onRequestPost = withQuotaHandling(async ({ request, env }) => {
  const { u, error } = await conLauncher(request, env);
  if (error) return error;
  const { datos } = await leerJson(request);
  if (!datos || datos.vistos !== true) return jsonResponse({ error: 'Datos no válidos.' }, 400);
  await d1Run(env, `UPDATE reportes SET novedad = 0 WHERE autor_user_id = ? AND novedad = 1`, [u.id]);
  return jsonResponse({ ok: true });
});
