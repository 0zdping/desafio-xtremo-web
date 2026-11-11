// GET /api/launcher/yo: dueño de esta sesión del launcher y nombre vinculado.
import { withQuotaHandling, jsonResponse } from '../../../backend/lib/http.js';
import { d1First } from '../../../backend/lib/db.js';
import { esStaff } from '../../../backend/lib/launcher.js';
import { conLauncher } from '../../../backend/lib/launcherHttp.js';

export const onRequestGet = withQuotaHandling(async ({ request, env }) => {
  const { u, error } = await conLauncher(request, env);
  if (error) return error;
  const v = await d1First(env, `SELECT nombre, premium FROM mc_vinculos WHERE user_id = ?`, [u.id]);
  return jsonResponse({
    usuario: { nombre: u.username, avatar: u.avatar },
    vinculo: v ? { nombre: v.nombre, premium: Boolean(v.premium) } : null,
    staff: await esStaff(env, u.id),
  });
});
