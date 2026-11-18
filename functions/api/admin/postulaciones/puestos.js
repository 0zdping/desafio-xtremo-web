// Panel: puestos de las postulaciones (abrir/cerrar y preguntas).
//   GET /api/admin/postulaciones/puestos
//   PUT /api/admin/postulaciones/puestos   { slug, abierta, descripcion, espera_dias, preguntas: [...] }
import { requirePermission, requirePermissionAndCsrf, jsonResponse, withQuotaHandling } from '../../../../backend/lib/adminGuard.js';
import { hasPermission } from '../../../../backend/lib/permissions.js';
import { d1Select, d1First, d1Run } from '../../../../backend/lib/db.js';
import { leerPreguntas, validarPreguntas } from '../../../../backend/lib/postulaciones.js';

export const onRequestGet = withQuotaHandling(async ({ request, env }) => {
  const guard = await requirePermission(request, env, 'postulaciones.review');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);
  const filas = await d1Select(env, `SELECT slug, nombre, descripcion, abierta, espera_dias, preguntas, updated_at FROM postulacion_puestos ORDER BY slug DESC`);
  return jsonResponse({
    puestos: filas.map((f) => ({ ...f, abierta: !!f.abierta, preguntas: leerPreguntas(f.preguntas) })),
    puedeGestionar: hasPermission(guard.permissions, 'postulaciones.manage'),
  });
});

export const onRequestPut = withQuotaHandling(async ({ request, env }) => {
  const guard = await requirePermissionAndCsrf(request, env, 'postulaciones.manage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return jsonResponse({ error: 'Cuerpo inválido.' }, 400);
  const puesto = await d1First(env, `SELECT slug FROM postulacion_puestos WHERE slug = ?`, [String(body.slug || '')]);
  if (!puesto) return jsonResponse({ error: 'Ese puesto no existe.' }, 404);
  const preguntas = validarPreguntas(body.preguntas);
  if (preguntas.error) return jsonResponse({ error: preguntas.error }, 400);
  const descripcion = String(body.descripcion || '').trim();
  if (descripcion.length > 500) return jsonResponse({ error: 'Descripción demasiado larga (máx. 500).' }, 400);
  const espera = Number(body.espera_dias);
  if (!Number.isInteger(espera) || espera < 0 || espera > 365) return jsonResponse({ error: 'Días de espera no válidos (0 a 365).' }, 400);
  await d1Run(
    env,
    `UPDATE postulacion_puestos SET abierta = ?, descripcion = ?, espera_dias = ?, preguntas = ?, updated_by = ?, updated_at = datetime('now') WHERE slug = ?`,
    [body.abierta ? 1 : 0, descripcion, espera, JSON.stringify(preguntas.value), guard.user.id, puesto.slug]
  );
  return jsonResponse({ ok: true });
});
