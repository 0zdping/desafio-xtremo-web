// GET /api/launcher/staff/resumen: sección de staff del launcher. Sesión del launcher +
// cuenta de staff con el permiso sanctions.access (el mismo que el panel de la web).
import { withQuotaHandling, jsonResponse } from '../../../../backend/lib/http.js';
import { d1Select } from '../../../../backend/lib/db.js';
import { getUserRolesAndPermissions, hasPermission } from '../../../../backend/lib/permissions.js';
import { conLauncher } from '../../../../backend/lib/launcherHttp.js';

export const onRequestGet = withQuotaHandling(async ({ request, env }) => {
  const { u, error } = await conLauncher(request, env);
  if (error) return error;
  const { roles, permissions } = await getUserRolesAndPermissions(env, u.id);
  if (!roles.length) return jsonResponse({ error: 'Solo para el staff.' }, 403);
  const puedeSanciones = hasPermission(permissions, 'sanctions.access');

  const staff = await d1Select(env, `SELECT nombre, servidor, desde, vanish, modo_staff FROM staff_online ORDER BY nombre`);
  let sanciones = [], activas = { ban: 0, mute: 0 }, ultimas24 = 0;
  if (puedeSanciones) {
    sanciones = await d1Select(
      env,
      `SELECT s.id, s.target_nick, s.type, s.reason, s.staff_name, s.created_at, s.origen, s.servidor, s.expires_at,
              s.revocada_at, s.revocada_por, (SELECT COUNT(*) FROM sanction_evidence e WHERE e.sanction_id = s.id) AS pruebas
       FROM sanctions s ORDER BY s.created_at DESC LIMIT 40`
    );
    const act = await d1Select(
      env,
      `SELECT type, COUNT(*) AS n FROM sanctions
       WHERE type IN ('ban','mute') AND revocada_at IS NULL AND (expires_at IS NULL OR expires_at > datetime('now'))
         AND (origen = 'juego') GROUP BY type`
    );
    for (const r of act) activas[r.type] = r.n;
    const ult = await d1Select(env, `SELECT COUNT(*) AS n FROM sanctions WHERE created_at > datetime('now', '-1 day')`);
    ultimas24 = ult[0] ? ult[0].n : 0;
  }
  return jsonResponse({
    rol: roles[0].name, puedeSanciones, staff,
    sanciones, activas, ultimas24,
  });
});
