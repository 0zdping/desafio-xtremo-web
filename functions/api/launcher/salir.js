// POST /api/launcher/salir: cierra la sesión del launcher.
import { withQuotaHandling, jsonResponse } from '../../../backend/lib/http.js';
import { d1Run } from '../../../backend/lib/db.js';
import { conLauncher } from '../../../backend/lib/launcherHttp.js';

export const onRequestPost = withQuotaHandling(async ({ request, env }) => {
  const { u, error } = await conLauncher(request, env);
  if (error) return error;
  await d1Run(env, `DELETE FROM launcher_sesiones WHERE token_hash = ?`, [u.tokenHash]);
  return jsonResponse({ ok: true });
});
