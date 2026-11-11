// POST /api/launcher/vincular/codigo: código de un solo uso para escribir /vincular dentro del juego.
import { withQuotaHandling, jsonResponse } from '../../../../backend/lib/http.js';
import { rateLimit } from '../../../../backend/lib/rateLimit.js';
import { d1Run } from '../../../../backend/lib/db.js';
import { codigoLegible } from '../../../../backend/lib/launcher.js';
import { conLauncher, ahora } from '../../../../backend/lib/launcherHttp.js';

export const onRequestPost = withQuotaHandling(async ({ request, env }) => {
  const { u, error } = await conLauncher(request, env);
  if (error) return error;
  const { allowed } = await rateLimit(env, `launcher-codigo:${u.id}`, 5, 60);
  if (!allowed) return jsonResponse({ error: 'Espera un minuto antes de pedir otro código.' }, 429);
  const codigo = codigoLegible(8);
  const expira = ahora() + 600;
  await d1Run(env, `DELETE FROM mc_codigos WHERE user_id = ? OR expires_at < ?`, [u.id, ahora()]);
  await d1Run(env, `INSERT INTO mc_codigos (codigo, user_id, expires_at) VALUES (?, ?, ?)`, [codigo, u.id, expira]);
  return jsonResponse({ codigo, expira });
});
