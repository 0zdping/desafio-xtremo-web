// POST /api/launcher/staff/encuestas: crear {pregunta, opciones[]} o cerrar/reabrir {id, abierta}.
// Permiso announcements.manage (el mismo que para publicar anuncios).
import { withQuotaHandling, jsonResponse } from '../../../../backend/lib/http.js';
import { d1Run } from '../../../../backend/lib/db.js';
import { leerJson } from '../../../../backend/lib/launcherHttp.js';
import { conStaff } from '../../../../backend/lib/launcherStaff.js';

export const onRequestPost = withQuotaHandling(async ({ request, env }) => {
  const { u, error } = await conStaff(request, env, 'announcements.manage');
  if (error) return error;
  const { datos } = await leerJson(request, 4000);
  if (!datos) return jsonResponse({ error: 'Datos no válidos.' }, 400);
  if (Number.isInteger(datos.id)) {
    await d1Run(env, `UPDATE encuestas SET abierta = ? WHERE id = ?`, [datos.abierta ? 1 : 0, datos.id]);
    return jsonResponse({ ok: true });
  }
  const pregunta = typeof datos.pregunta === 'string' ? datos.pregunta.trim().slice(0, 200) : '';
  const opciones = Array.isArray(datos.opciones)
    ? datos.opciones.map((o) => (typeof o === 'string' ? o.trim().slice(0, 80) : '')).filter(Boolean).slice(0, 6)
    : [];
  if (pregunta.length < 5 || opciones.length < 2) return jsonResponse({ error: 'Escribe la pregunta y al menos dos opciones.' }, 400);
  await d1Run(env, `INSERT INTO encuestas (pregunta, opciones, creada_por) VALUES (?, ?, ?)`, [pregunta, JSON.stringify(opciones), u.username]);
  return jsonResponse({ ok: true });
});
