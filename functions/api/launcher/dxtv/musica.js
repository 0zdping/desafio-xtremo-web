// GET /api/launcher/dxtv/musica: lista de canciones para la realización de DX TV (solo owners).
import { withQuotaHandling, jsonResponse } from '../../../../backend/lib/http.js';
import { conLauncher } from '../../../../backend/lib/launcherHttp.js';
import { getUserRolesAndPermissions, actorRank } from '../../../../backend/lib/permissions.js';
import { MUSICA } from '../../../../backend/lib/dxtvMusica.js';

export const onRequestGet = withQuotaHandling(async ({ request, env }) => {
  const { u, error } = await conLauncher(request, env);
  if (error) return error;
  const { roles } = await getUserRolesAndPermissions(env, u.id);
  if (actorRank(roles) !== Infinity) return jsonResponse({ error: 'Solo los owners pueden emitir DX TV.' }, 403);
  return jsonResponse({ canciones: MUSICA });
});
