// POST /api/launcher/desvincular: quita el nombre de Minecraft de esta cuenta.
import { withQuotaHandling, jsonResponse } from '../../../backend/lib/http.js';
import { d1Run } from '../../../backend/lib/db.js';
import { conLauncher } from '../../../backend/lib/launcherHttp.js';

export const onRequestPost = withQuotaHandling(async ({ request, env }) => {
  const { u, error } = await conLauncher(request, env);
  if (error) return error;
  await d1Run(env, `DELETE FROM mc_vinculos WHERE user_id = ?`, [u.id]);
  return jsonResponse({ ok: true });
});
