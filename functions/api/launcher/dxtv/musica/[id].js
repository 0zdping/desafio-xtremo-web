// GET /api/launcher/dxtv/musica/:id: el .ogg de una canción, desde el bucket privado (solo owners).
import { withQuotaHandling, jsonResponse } from '../../../../../backend/lib/http.js';
import { conLauncher } from '../../../../../backend/lib/launcherHttp.js';
import { getUserRolesAndPermissions, actorRank } from '../../../../../backend/lib/permissions.js';
import { checkQuota, addUsage } from '../../../../../backend/lib/quota.js';
import { MUSICA } from '../../../../../backend/lib/dxtvMusica.js';

export const onRequestGet = withQuotaHandling(async ({ request, env, params }) => {
  const { u, error } = await conLauncher(request, env);
  if (error) return error;
  const { roles } = await getUserRolesAndPermissions(env, u.id);
  if (actorRank(roles) !== Infinity) return jsonResponse({ error: 'Solo los owners pueden emitir DX TV.' }, 403);
  const c = MUSICA.find((x) => x.id === params.id);
  if (!c) return jsonResponse({ error: 'No existe.' }, 404);
  if (!env.EVIDENCE) return jsonResponse({ error: 'Almacenamiento no configurado.' }, 503);
  const gate = await checkQuota(env, 'r2_class_b');
  if (!gate.allowed) return jsonResponse({ error: 'Límite de lecturas de R2 alcanzado este mes.' }, 429);
  const obj = await env.EVIDENCE.get(`dxtv/musica/${c.id}.ogg`);
  await addUsage(env, 'r2_class_b', 1);
  if (!obj) return jsonResponse({ error: 'Falta el audio en el almacenamiento.' }, 404);
  return new Response(obj.body, { headers: { 'Content-Type': 'audio/ogg', 'Content-Length': String(obj.size), 'Cache-Control': 'private, no-store' } });
});
