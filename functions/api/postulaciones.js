// Postulaciones a Staff / Desarrollo (página /postular).
//   GET  /api/postulaciones   puestos (con sus preguntas) + mis postulaciones si hay sesión
//   POST /api/postulaciones   { puesto, respuestas: { <id>: "..." } }   (sesión + CSRF)
import { requireAuthAndCsrf, jsonResponse, withQuotaHandling } from '../../backend/lib/authGuard.js';
import { parseCookie } from '../../backend/lib/cookies.js';
import { getUserFromSession, SESSION_COOKIE } from '../../backend/lib/session.js';
import { d1Select, d1First, d1Run } from '../../backend/lib/db.js';
import { rateLimit } from '../../backend/lib/rateLimit.js';
import { leerPreguntas, validarRespuestas, avisarDiscord } from '../../backend/lib/postulaciones.js';

const NO_CACHE = { 'Cache-Control': 'private, no-store' };

export const onRequestGet = withQuotaHandling(async ({ request, env }) => {
  const filas = await d1Select(env, `SELECT slug, nombre, descripcion, abierta, espera_dias, preguntas FROM postulacion_puestos ORDER BY slug DESC`);
  const puestos = filas.map((f) => ({ ...f, abierta: !!f.abierta, preguntas: f.abierta ? leerPreguntas(f.preguntas) : [] }));

  const sid = parseCookie(request.headers.get('cookie'), SESSION_COOKIE);
  const user = sid ? await getUserFromSession(env, sid) : null;
  if (!user) return jsonResponse({ puestos, sesion: false }, 200, NO_CACHE);

  const [mias, vinculo] = await Promise.all([
    d1Select(env, `SELECT id, puesto, estado, respuesta, created_at, updated_at FROM postulaciones WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`, [user.id]),
    d1First(env, `SELECT nombre FROM mc_vinculos WHERE user_id = ?`, [user.id]),
  ]);
  return jsonResponse({ puestos, sesion: true, mias, mc: vinculo ? vinculo.nombre : null }, 200, NO_CACHE);
});

export const onRequestPost = withQuotaHandling(async ({ request, env }) => {
  const guard = await requireAuthAndCsrf(request, env);
  if (!guard.ok) return jsonResponse(guard.body, guard.status);
  const user = guard.user;

  const rl = await rateLimit(env, `postular:${user.id}`, 10, 3600);
  if (!rl.allowed) return jsonResponse({ error: 'Demasiados intentos. Prueba dentro de un rato.' }, 429);

  const body = await request.json().catch(() => null);
  const slug = String((body && body.puesto) || '');
  const puesto = await d1First(env, `SELECT slug, nombre, abierta, espera_dias, preguntas FROM postulacion_puestos WHERE slug = ?`, [slug]);
  if (!puesto) return jsonResponse({ error: 'Ese puesto no existe.' }, 404);
  if (!puesto.abierta) return jsonResponse({ error: 'Las postulaciones para este puesto están cerradas ahora mismo.' }, 409);

  const previas = await d1Select(
    env,
    `SELECT estado, updated_at FROM postulaciones WHERE user_id = ? AND puesto = ? ORDER BY created_at DESC LIMIT 5`,
    [user.id, slug]
  );
  if (previas.some((p) => p.estado === 'pendiente' || p.estado === 'en_revision')) {
    return jsonResponse({ error: 'Ya tienes una postulación a este puesto en revisión.' }, 409);
  }
  if (previas.some((p) => p.estado === 'aceptada')) return jsonResponse({ error: 'Ya te aceptaron en este puesto.' }, 409);
  const rechazo = previas.find((p) => p.estado === 'rechazada');
  if (rechazo && puesto.espera_dias > 0) {
    const hasta = Date.parse(rechazo.updated_at.replace(' ', 'T') + 'Z') + puesto.espera_dias * 86400000;
    if (Date.now() < hasta) {
      const dias = Math.ceil((hasta - Date.now()) / 86400000);
      return jsonResponse({ error: `Podrás volver a postularte dentro de ${dias} día${dias === 1 ? '' : 's'}.` }, 409);
    }
  }

  const val = validarRespuestas(leerPreguntas(puesto.preguntas), body && body.respuestas);
  if (val.error) return jsonResponse({ error: val.error }, 400);

  const vinculo = await d1First(env, `SELECT nombre FROM mc_vinculos WHERE user_id = ?`, [user.id]);
  try {
    await d1Run(env, `INSERT INTO postulaciones (user_id, puesto, respuestas, mc_nombre) VALUES (?, ?, ?, ?)`, [
      user.id,
      slug,
      JSON.stringify(val.value),
      vinculo ? vinculo.nombre : null,
    ]);
  } catch (err) {
    if (/UNIQUE/i.test(String(err && err.message))) return jsonResponse({ error: 'Ya tienes una postulación a este puesto en revisión.' }, 409);
    throw err;
  }

  const origin = new URL(request.url).origin;
  await avisarDiscord(env, `Nueva postulación a **${puesto.nombre}** de **${user.username || 'alguien'}**${vinculo ? ` (${vinculo.nombre})` : ''}. Revísala en ${origin}/admin.html#postulaciones`);
  return jsonResponse({ ok: true }, 201);
});
