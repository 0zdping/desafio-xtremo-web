// POST /api/launcher/dxtv/billete: billete para la cámara de DX TV (cuenta reservada DesafioTV).
// Solo los owners (rango bloqueado: Owner / Co-Owner) con el launcher conectado. El proxy (DX Login 1.6.0+)
// rechaza ese nombre sin billete, así que esta es la única forma de entrar con la cámara.
import { withQuotaHandling, jsonResponse } from '../../../../backend/lib/http.js';
import { rateLimit } from '../../../../backend/lib/rateLimit.js';
import { firmarBillete } from '../../../../backend/lib/launcher.js';
import { conLauncher } from '../../../../backend/lib/launcherHttp.js';
import { getUserRolesAndPermissions, actorRank } from '../../../../backend/lib/permissions.js';

const CAMARA = { nombre: 'DesafioTV', uuid: '6d4c478b-e3a5-3476-bd06-c9ba899f4c19' }; // UUID sin premium de "DesafioTV"

export const onRequestPost = withQuotaHandling(async ({ request, env }) => {
  const { u, error } = await conLauncher(request, env);
  if (error) return error;
  const { allowed } = await rateLimit(env, `dxtv-billete:${u.id}`, 10, 60);
  if (!allowed) return jsonResponse({ error: 'Demasiadas peticiones.' }, 429);
  const { roles } = await getUserRolesAndPermissions(env, u.id);
  if (actorRank(roles) !== Infinity) return jsonResponse({ error: 'Solo los owners pueden emitir DX TV.' }, 403);
  if (!env.DX_BILLETE_CLAVE) return jsonResponse({ error: 'Billetes desactivados.' }, 503);
  const { billete, caduca } = await firmarBillete(env, CAMARA);
  console.log(`DX TV: billete de cámara para el usuario ${u.id}`);
  return jsonResponse({ billete, nombre: CAMARA.nombre, caduca });
});
