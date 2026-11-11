// POST /api/launcher/conectar/confirmar: el jugador, con su sesión de la web, acepta conectar el launcher.
import { withQuotaHandling, jsonResponse, requireAuthAndCsrf } from '../../../../backend/lib/authGuard.js';
import { d1First, d1Run } from '../../../../backend/lib/db.js';
import { aleatorio, b64url, sha256Hex } from '../../../../backend/lib/launcher.js';
import { leerJson, ahora } from '../../../../backend/lib/launcherHttp.js';

export const onRequestPost = withQuotaHandling(async ({ request, env }) => {
  const g = await requireAuthAndCsrf(request, env);
  if (!g.ok) return jsonResponse(g.body, g.status);
  const { datos } = await leerJson(request);
  const codigo = datos && typeof datos.codigo === 'string' ? datos.codigo : '';
  if (!/^[A-Za-z0-9_-]{32}$/.test(codigo)) return jsonResponse({ error: 'Enlace no válido.' }, 400);
  const fila = await d1First(env, `SELECT user_id, expires_at FROM launcher_conexiones WHERE codigo = ?`, [codigo]);
  if (!fila || fila.expires_at < ahora()) {
    return jsonResponse({ error: 'Este enlace ha caducado. Vuelve a pulsar Conectar en el launcher.' }, 410);
  }
  if (fila.user_id) return jsonResponse({ error: 'Este enlace ya se usó.' }, 409);
  const token = b64url(aleatorio(32));
  await d1Run(env, `INSERT INTO launcher_sesiones (token_hash, user_id) VALUES (?, ?)`, [await sha256Hex(token), g.user.id]);
  await d1Run(env, `UPDATE launcher_conexiones SET user_id = ?, token = ? WHERE codigo = ? AND user_id IS NULL`, [g.user.id, token, codigo]);
  return jsonResponse({ ok: true, nombre: g.user.username });
});
