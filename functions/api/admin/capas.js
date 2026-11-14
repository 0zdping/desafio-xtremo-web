// Capas exclusivas del launcher (por ahora "dev": equipo de desarrollo y staff).
// Solo los owners (rango bloqueado: Owner / Co-Owner) pueden verlas, darlas y quitarlas.
//   GET    /api/admin/capas
//   POST   /api/admin/capas            { nombre, capa }
//   DELETE /api/admin/capas?nombre=X&capa=dev
import {
  requirePermission,
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../backend/lib/adminGuard.js';
import { actorRank } from '../../../backend/lib/permissions.js';
import { d1Select, d1Run } from '../../../backend/lib/db.js';
import { purgeEdgeCache } from '../../../backend/lib/edgeCache.js';

const CAPAS = ['dev'];
const NOMBRE = /^[A-Za-z0-9_]{3,16}$/;
const soloOwners = (guard) => actorRank(guard.roles) === Infinity;

async function purgar(context) {
  const origin = new URL(context.request.url).origin;
  await purgeEdgeCache(context, [`${origin}/api/launcher/capas`]);
}

export const onRequestGet = withQuotaHandling(async ({ request, env }) => {
  const guard = await requirePermission(request, env, 'panel.access');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);
  if (!soloOwners(guard)) return jsonResponse({ error: 'Solo los owners gestionan las capas.' }, 403);
  const capas = await d1Select(env, `SELECT nombre, capa, dado_por, created_at FROM launcher_capas ORDER BY created_at DESC`);
  return jsonResponse({ capas, disponibles: CAPAS });
});

export const onRequestPost = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'panel.access');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);
  if (!soloOwners(guard)) return jsonResponse({ error: 'Solo los owners gestionan las capas.' }, 403);
  const body = await request.json().catch(() => null);
  const nombre = String((body && body.nombre) || '').trim();
  const capa = String((body && body.capa) || '');
  if (!NOMBRE.test(nombre)) return jsonResponse({ error: 'Nombre de Minecraft no válido (3 a 16: letras, números y _).' }, 400);
  if (!CAPAS.includes(capa)) return jsonResponse({ error: 'Esa capa no existe.' }, 400);
  await d1Run(
    env,
    `INSERT OR IGNORE INTO launcher_capas (nombre, capa, dado_por) VALUES (?, ?, ?)`,
    [nombre, capa, guard.user.username || String(guard.user.id)]
  );
  await purgar(context);
  return jsonResponse({ ok: true }, 201);
});

export const onRequestDelete = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'panel.access');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);
  if (!soloOwners(guard)) return jsonResponse({ error: 'Solo los owners gestionan las capas.' }, 403);
  const p = new URL(request.url).searchParams;
  const nombre = String(p.get('nombre') || '');
  const capa = String(p.get('capa') || '');
  if (!NOMBRE.test(nombre) || !CAPAS.includes(capa)) return jsonResponse({ error: 'Datos no válidos.' }, 400);
  await d1Run(env, `DELETE FROM launcher_capas WHERE nombre = ? AND capa = ?`, [nombre, capa]);
  await purgar(context);
  return jsonResponse({ ok: true });
});
