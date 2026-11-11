// POST /api/launcher/reportar: reportar a un jugador desde el launcher. Hace falta la cuenta
// de la web conectada (así el staff sabe quién reporta y no se puede inundar de anónimos).
import { withQuotaHandling, jsonResponse } from '../../../backend/lib/http.js';
import { rateLimit } from '../../../backend/lib/rateLimit.js';
import { d1First, d1Run } from '../../../backend/lib/db.js';
import { NOMBRE_MC } from '../../../backend/lib/launcher.js';
import { conLauncher, leerJson } from '../../../backend/lib/launcherHttp.js';

const MOTIVOS = ['Trampas o mods prohibidos', 'Insultos o acoso', 'Spam o publicidad', 'Robo o destrozos', 'Abuso de fallos', 'Otro'];

export const onRequestPost = withQuotaHandling(async ({ request, env }) => {
  const { u, error } = await conLauncher(request, env);
  if (error) return error;
  const { datos } = await leerJson(request, 4000);
  if (!datos) return jsonResponse({ error: 'Datos no válidos.' }, 400);
  const objetivo = typeof datos.objetivo === 'string' ? datos.objetivo.trim() : '';
  if (!NOMBRE_MC.test(objetivo)) return jsonResponse({ error: 'Escribe el nombre de Minecraft del jugador.' }, 400);
  if (!MOTIVOS.includes(datos.motivo)) return jsonResponse({ error: 'Elige un motivo.' }, 400);
  const detalle = typeof datos.detalle === 'string' ? datos.detalle.trim().slice(0, 1000) : '';
  if (datos.motivo === 'Otro' && detalle.length < 10) return jsonResponse({ error: 'Cuéntanos un poco qué ha pasado.' }, 400);
  const v = await d1First(env, `SELECT nombre FROM mc_vinculos WHERE user_id = ?`, [u.id]);
  if (v && v.nombre.toLowerCase() === objetivo.toLowerCase()) return jsonResponse({ error: 'No puedes reportarte a ti mismo.' }, 400);
  const { allowed } = await rateLimit(env, `launcher-reporte:${u.id}`, 5, 3600);
  if (!allowed) return jsonResponse({ error: 'Has mandado varios reportes seguidos. Prueba dentro de un rato.' }, 429);
  await d1Run(env, `INSERT INTO reportes (autor_user_id, autor_nombre, objetivo, motivo, detalle) VALUES (?, ?, ?, ?, ?)`,
    [u.id, v ? v.nombre : u.username, objetivo, datos.motivo, detalle || null]);
  return jsonResponse({ ok: true });
});
