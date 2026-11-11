// POST /api/launcher/conectar: el launcher pide conectar una cuenta. Público, limitado por IP.
import { withQuotaHandling, jsonResponse } from '../../../backend/lib/http.js';
import { rateLimit, clientIp } from '../../../backend/lib/rateLimit.js';
import { d1Run } from '../../../backend/lib/db.js';
import { aleatorio, b64url, sha256Hex } from '../../../backend/lib/launcher.js';
import { ahora } from '../../../backend/lib/launcherHttp.js';

export const onRequestPost = withQuotaHandling(async ({ request, env }) => {
  const { allowed } = await rateLimit(env, `launcher-conectar:${clientIp(request)}`, 10, 60);
  if (!allowed) return jsonResponse({ error: 'Demasiados intentos. Prueba en un minuto.' }, 429);
  const codigo = b64url(aleatorio(24));
  const sondeo = b64url(aleatorio(32));
  const expira = ahora() + 600;
  await d1Run(env, `DELETE FROM launcher_conexiones WHERE expires_at < ?`, [ahora()]);
  await d1Run(env, `INSERT INTO launcher_conexiones (codigo, sondeo_hash, expires_at) VALUES (?, ?, ?)`, [codigo, await sha256Hex(sondeo), expira]);
  const url = new URL(`/launcher?c=${codigo}`, request.url).toString();
  return jsonResponse({ codigo, sondeo, url, expira });
});
