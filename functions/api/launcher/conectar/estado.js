// POST /api/launcher/conectar/estado: el launcher pregunta si ya se aceptó. Entrega el token una sola vez.
import { withQuotaHandling, jsonResponse } from '../../../../backend/lib/http.js';
import { rateLimit, clientIp } from '../../../../backend/lib/rateLimit.js';
import { d1First, d1Run } from '../../../../backend/lib/db.js';
import { sha256Hex } from '../../../../backend/lib/launcher.js';
import { leerJson, ahora } from '../../../../backend/lib/launcherHttp.js';

export const onRequestPost = withQuotaHandling(async ({ request, env }) => {
  const { allowed } = await rateLimit(env, `launcher-estado:${clientIp(request)}`, 40, 60);
  if (!allowed) return jsonResponse({ error: 'Demasiadas consultas.' }, 429);
  const { datos } = await leerJson(request);
  const sondeo = datos && typeof datos.sondeo === 'string' ? datos.sondeo : '';
  if (!/^[A-Za-z0-9_-]{43}$/.test(sondeo)) return jsonResponse({ error: 'Petición no válida.' }, 400);
  const fila = await d1First(env, `SELECT codigo, token, expires_at FROM launcher_conexiones WHERE sondeo_hash = ?`, [await sha256Hex(sondeo)]);
  if (!fila || fila.expires_at < ahora()) return jsonResponse({ estado: 'caducado' });
  if (!fila.token) return jsonResponse({ estado: 'pendiente' });
  await d1Run(env, `DELETE FROM launcher_conexiones WHERE codigo = ?`, [fila.codigo]);
  return jsonResponse({ estado: 'listo', token: fila.token });
});
