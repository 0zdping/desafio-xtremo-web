// POST /api/launcher/vincular/confirmar: SOLO el proxy (petición firmada con su clave Ed25519).
// Lo llama cuando alguien ya autenticado en el juego (Mojang o /login) escribe /vincular <código>.
import { withQuotaHandling, jsonResponse } from '../../../../backend/lib/http.js';
import { d1First, d1Run } from '../../../../backend/lib/db.js';
import { firmaServidorValida, NOMBRE_MC, UUID_MC } from '../../../../backend/lib/launcher.js';
import { leerJson, ahora } from '../../../../backend/lib/launcherHttp.js';

export const onRequestPost = withQuotaHandling(async ({ request, env }) => {
  const { texto, datos } = await leerJson(request);
  if (!(await firmaServidorValida(request, env, texto))) return jsonResponse({ error: 'Firma no válida.' }, 401);
  if (!datos) return jsonResponse({ error: 'Petición no válida.' }, 400);
  const { codigo, nombre, uuid, premium } = datos;
  if (typeof codigo !== 'string' || !/^[A-Za-z0-9]{8}$/.test(codigo)
      || typeof nombre !== 'string' || !NOMBRE_MC.test(nombre)
      || typeof uuid !== 'string' || !UUID_MC.test(uuid) || typeof premium !== 'boolean') {
    return jsonResponse({ error: 'Datos no válidos.' }, 400);
  }
  const cod = codigo.toUpperCase();
  const c = await d1First(env, `SELECT user_id, expires_at FROM mc_codigos WHERE codigo = ?`, [cod]);
  if (!c || c.expires_at < ahora()) return jsonResponse({ error: 'codigo' }, 404);
  await d1Run(env, `DELETE FROM mc_codigos WHERE codigo = ?`, [cod]);
  const otro = await d1First(env, `SELECT user_id FROM mc_vinculos WHERE nombre_lower = ?`, [nombre.toLowerCase()]);
  if (otro && otro.user_id !== c.user_id) return jsonResponse({ error: 'ocupado' }, 409);
  await d1Run(
    env,
    `INSERT INTO mc_vinculos (user_id, nombre, nombre_lower, uuid, premium) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET nombre = excluded.nombre, nombre_lower = excluded.nombre_lower,
       uuid = excluded.uuid, premium = excluded.premium, created_at = datetime('now')`,
    [c.user_id, nombre, nombre.toLowerCase(), uuid.toLowerCase(), premium ? 1 : 0]
  );
  const u = await d1First(env, `SELECT username FROM users WHERE id = ?`, [c.user_id]);
  return jsonResponse({ ok: true, usuario: u ? u.username : '' });
});
