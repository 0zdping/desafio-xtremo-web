// POST /api/launcher/actividad: SOLO el proxy (DX Login, firmado con su clave Ed25519).
// Cada 5 minutos manda quién está conectado y en qué servidor (y su clan, si lo sabe).
// Con eso se suman los minutos jugados, se guarda la última conexión y se publica la
// lista de conectados para el launcher. El staff en vanish no sale en la lista pública
// ni mueve su "última vez" pública (staff_online lo publica dx-staff).
import { withQuotaHandling, jsonResponse } from '../../../backend/lib/http.js';
import { d1Select, d1Run } from '../../../backend/lib/db.js';
import { checkQuota, addUsage, QuotaExceededError } from '../../../backend/lib/quota.js';
import { purgeEdgeCache } from '../../../backend/lib/edgeCache.js';
import { firmaServidorValida, NOMBRE_MC, UUID_MC } from '../../../backend/lib/launcher.js';
import { leerJson } from '../../../backend/lib/launcherHttp.js';

const SERVIDOR = /^[a-z0-9_-]{1,32}$/;

function uuidConGuiones(u) {
  const h = u.replace(/-/g, '').toLowerCase();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const texto = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export const onRequestPost = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const { texto: cuerpo, datos } = await leerJson(request, 60000);
  if (!(await firmaServidorValida(request, env, cuerpo))) return jsonResponse({ error: 'Firma no válida.' }, 401);
  if (!datos || typeof datos.servidores !== 'object' || datos.servidores === null) return jsonResponse({ error: 'Datos no válidos.' }, 400);
  const intervalo = Math.max(0, Math.min(10, Math.round(Number(datos.intervalo) || 0)));

  const enVanish = new Set(
    (await d1Select(env, `SELECT uuid FROM staff_online WHERE vanish = 1`)).map((r) => String(r.uuid).replace(/-/g, '').toLowerCase())
  );

  const publico = {};
  const filas = [];
  for (const [srv, lista] of Object.entries(datos.servidores).slice(0, 10)) {
    if (!SERVIDOR.test(srv) || !Array.isArray(lista)) continue;
    publico[srv] = [];
    for (const j of lista.slice(0, 300)) {
      if (!j || typeof j.u !== 'string' || !UUID_MC.test(j.u) || typeof j.n !== 'string' || !NOMBRE_MC.test(j.n)) continue;
      const uuid = uuidConGuiones(j.u);
      const oculto = enVanish.has(uuid.replace(/-/g, ''));
      if (!oculto) publico[srv].push(j.n);
      // clan: undefined = no se sabe (no se toca); null = sin clan.
      const clanSabido = Object.prototype.hasOwnProperty.call(j, 'c');
      filas.push({ uuid, nombre: j.n, srv, oculto, clanSabido, siglas: texto(j.c, 8), clan: texto(j.cn, 40) });
    }
  }

  if (filas.length) {
    const gate = await checkQuota(env, 'd1_writes');
    if (!gate.allowed) throw new QuotaExceededError('d1_writes');
    const stmts = filas.map((f) =>
      env.DB.prepare(
        `INSERT INTO jugadores (uuid, nombre, nombre_lower, ultima_vez, ultima_real, ultimo_servidor, minutos, clan_siglas, clan_nombre)
         VALUES (?1, ?2, lower(?2), CASE WHEN ?3 THEN NULL ELSE datetime('now') END, datetime('now'), CASE WHEN ?3 THEN NULL ELSE ?4 END, ?5, ?7, ?8)
         ON CONFLICT(uuid) DO UPDATE SET
           nombre = excluded.nombre, nombre_lower = excluded.nombre_lower,
           ultima_vez = CASE WHEN ?3 THEN jugadores.ultima_vez ELSE datetime('now') END,
           ultima_real = datetime('now'),
           ultimo_servidor = CASE WHEN ?3 THEN jugadores.ultimo_servidor ELSE ?4 END,
           minutos = jugadores.minutos + ?5,
           clan_siglas = CASE WHEN ?6 THEN ?7 ELSE jugadores.clan_siglas END,
           clan_nombre = CASE WHEN ?6 THEN ?8 ELSE jugadores.clan_nombre END`
      ).bind(f.uuid, f.nombre, f.oculto ? 1 : 0, f.srv, intervalo, f.clanSabido ? 1 : 0, f.siglas, f.clan)
    );
    await env.DB.batch(stmts);
    await addUsage(env, 'd1_writes', stmts.length);
  }

  await d1Run(
    env,
    `INSERT INTO servidor_estado (clave, valor, updated_at) VALUES ('online', ?, datetime('now'))
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, updated_at = excluded.updated_at`,
    [JSON.stringify(publico)]
  );
  const base = new URL(request.url);
  await purgeEdgeCache(context, [new URL('/api/launcher/online', base).toString()]);
  return jsonResponse({ ok: true, jugadores: filas.length });
});
