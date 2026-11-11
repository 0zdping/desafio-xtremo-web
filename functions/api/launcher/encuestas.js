// GET  /api/launcher/encuestas: encuestas abiertas y las cerradas recientes, con resultados.
//      Con la sesión del launcher, también qué votaste tú.
// POST /api/launcher/encuestas {id, opcion}: votar (un voto por cuenta; se puede cambiar mientras esté abierta).
import { withQuotaHandling, jsonResponse } from '../../../backend/lib/http.js';
import { d1Select, d1First, d1Run } from '../../../backend/lib/db.js';
import { usuarioLauncher } from '../../../backend/lib/launcher.js';
import { conLauncher, leerJson } from '../../../backend/lib/launcherHttp.js';

export const onRequestGet = withQuotaHandling(async ({ request, env }) => {
  const u = await usuarioLauncher(request, env);
  const encuestas = await d1Select(
    env,
    `SELECT id, pregunta, opciones, abierta, created_at FROM encuestas
     WHERE abierta = 1 OR created_at > datetime('now', '-30 days') ORDER BY abierta DESC, created_at DESC LIMIT 10`
  );
  if (!encuestas.length) return jsonResponse({ conectado: Boolean(u), encuestas: [] });
  const ids = encuestas.map((e) => e.id);
  const marcas = ids.map(() => '?').join(',');
  const votos = await d1Select(
    env,
    `SELECT encuesta_id, opcion, COUNT(*) AS n FROM encuesta_votos WHERE encuesta_id IN (${marcas}) GROUP BY encuesta_id, opcion`,
    ids
  );
  const mios = u
    ? await d1Select(env, `SELECT encuesta_id, opcion FROM encuesta_votos WHERE user_id = ? AND encuesta_id IN (${marcas})`, [u.id, ...ids])
    : [];
  return jsonResponse({
    conectado: Boolean(u),
    encuestas: encuestas.map((e) => {
      let opciones = [];
      try { opciones = JSON.parse(e.opciones); } catch { opciones = []; }
      const cuenta = opciones.map((_, i) => (votos.find((v) => v.encuesta_id === e.id && v.opcion === i) || { n: 0 }).n);
      const mio = mios.find((m) => m.encuesta_id === e.id);
      return {
        id: e.id, pregunta: e.pregunta, opciones, votos: cuenta, abierta: Boolean(e.abierta),
        fecha: e.created_at, miVoto: mio ? mio.opcion : null,
      };
    }),
  });
});

export const onRequestPost = withQuotaHandling(async ({ request, env }) => {
  const { u, error } = await conLauncher(request, env);
  if (error) return error;
  const { datos } = await leerJson(request);
  if (!datos || !Number.isInteger(datos.id) || !Number.isInteger(datos.opcion)) return jsonResponse({ error: 'Datos no válidos.' }, 400);
  const e = await d1First(env, `SELECT opciones, abierta FROM encuestas WHERE id = ?`, [datos.id]);
  if (!e) return jsonResponse({ error: 'Esa encuesta no existe.' }, 404);
  if (!e.abierta) return jsonResponse({ error: 'La encuesta ya está cerrada.' }, 409);
  let n = 0;
  try { n = JSON.parse(e.opciones).length; } catch { n = 0; }
  if (datos.opcion < 0 || datos.opcion >= n) return jsonResponse({ error: 'Opción no válida.' }, 400);
  await d1Run(
    env,
    `INSERT INTO encuesta_votos (encuesta_id, user_id, opcion) VALUES (?, ?, ?)
     ON CONFLICT(encuesta_id, user_id) DO UPDATE SET opcion = excluded.opcion, created_at = datetime('now')`,
    [datos.id, u.id, datos.opcion]
  );
  return jsonResponse({ ok: true });
});
