// POST /api/launcher/billete: billete firmado para entrar al servidor sin /login.
// Regla 1 de docs/SEGURIDAD.md (repo dx-launcher): nunca para cuentas del staff o del equipo.
import { withQuotaHandling, jsonResponse } from '../../../backend/lib/http.js';
import { rateLimit } from '../../../backend/lib/rateLimit.js';
import { d1First } from '../../../backend/lib/db.js';
import { esStaff, firmarBillete } from '../../../backend/lib/launcher.js';
import { conLauncher } from '../../../backend/lib/launcherHttp.js';

export const onRequestPost = withQuotaHandling(async ({ request, env }) => {
  const { u, error } = await conLauncher(request, env);
  if (error) return error;
  const { allowed } = await rateLimit(env, `launcher-billete:${u.id}`, 20, 60);
  if (!allowed) return jsonResponse({ error: 'Demasiadas peticiones.' }, 429);
  const v = await d1First(env, `SELECT nombre, uuid FROM mc_vinculos WHERE user_id = ?`, [u.id]);
  if (!v) return jsonResponse({ error: 'Primero vincula tu nombre de Minecraft.' }, 409);
  if (await esStaff(env, u.id)) {
    return jsonResponse({ error: 'Las cuentas del staff entran siempre verificadas, sin billete.', staff: true }, 403);
  }
  if (!env.DX_BILLETE_CLAVE) return jsonResponse({ error: 'Billetes desactivados.' }, 503);
  const { billete, caduca } = await firmarBillete(env, { nombre: v.nombre, uuid: v.uuid });
  return jsonResponse({ billete, nombre: v.nombre, caduca });
});
