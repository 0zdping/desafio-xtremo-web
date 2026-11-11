// GET /api/launcher/staff/informes: lista de informes de fallo (staff).
// GET /api/launcher/staff/informes?id=N: el texto de un informe.
import { withQuotaHandling, jsonResponse } from '../../../../backend/lib/http.js';
import { d1Select, d1First } from '../../../../backend/lib/db.js';
import { getUserRolesAndPermissions } from '../../../../backend/lib/permissions.js';
import { conLauncher } from '../../../../backend/lib/launcherHttp.js';

export const onRequestGet = withQuotaHandling(async ({ request, env }) => {
  const { u, error } = await conLauncher(request, env);
  if (error) return error;
  const { roles } = await getUserRolesAndPermissions(env, u.id);
  if (!roles.length) return jsonResponse({ error: 'Solo para el staff.' }, 403);
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (Number.isInteger(id) && id > 0) {
    const f = await d1First(env, `SELECT r2_key FROM informes_fallo WHERE id = ?`, [id]);
    if (!f || !env.EVIDENCE) return jsonResponse({ error: 'No existe.' }, 404);
    const obj = await env.EVIDENCE.get(f.r2_key);
    if (!obj) return jsonResponse({ error: 'No existe.' }, 404);
    return new Response(obj.body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
  const informes = await d1Select(env, `SELECT id, nombre, version_launcher, sistema, resumen, tamano, created_at FROM informes_fallo ORDER BY id DESC LIMIT 30`);
  return jsonResponse({ informes });
});
