// GET /api/jugador/<nombre>: perfil público de un jugador (web /jugador.html y launcher).
// Solo datos públicos: nada de rangos, sanciones ni la conexión real del staff en vanish.
// Incluye su aspecto para el visor 3D: skin, capa de Minecraft y capa DX (lo que lleva puesto
// la última vez que se le vio en el servidor). Las texturas se sirven por /api/textura/<id>.
import { withQuotaHandling, jsonResponse } from '../../../backend/lib/http.js';
import { d1First, d1Select } from '../../../backend/lib/db.js';
import { cachedPublicJson } from '../../../backend/lib/edgeCache.js';
import { NOMBRE_MC } from '../../../backend/lib/launcher.js';
import { capasDe } from '../../../backend/lib/capas.js';

const COLUMNAS = `j.nombre, j.uuid, j.primera_vez, j.ultima_vez, j.minutos, j.clan_siglas, j.clan_nombre,
  (SELECT COUNT(*) + 1 FROM jugadores o WHERE o.minutos > j.minutos AND o.ultima_vez IS NOT NULL) AS puesto`;

/** URL de textura -> id del proxy (/api/textura/<id>), o null si no es nuestra ni de Mojang. */
function idTextura(url) {
  if (typeof url !== 'string') return null;
  let m = /^https?:\/\/textures\.minecraft\.net\/texture\/([0-9a-f]{20,80})$/.exec(url);
  if (m) return `m-${m[1]}`;
  m = /^https:\/\/media\.desafioxtremo\.site\/skins\/([0-9a-f]{64})\.png$/.exec(url);
  return m ? `s-${m[1]}` : null;
}

/** Para las cuentas de Minecraft que aún no tienen aspecto guardado: su skin de Mojang. */
async function aspectoMojang(uuid) {
  const h = String(uuid || '').replace(/-/g, '').toLowerCase();
  if (!/^[0-9a-f]{12}4[0-9a-f]{19}$/.test(h)) return null; // las cuentas sin premium no están en Mojang
  try {
    const r = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${h}`, { cf: { cacheTtl: 600 } });
    if (r.status !== 200) return null;
    const p = await r.json();
    const t = (p.properties || []).find((x) => x.name === 'textures');
    if (!t) return null;
    const tex = JSON.parse(atob(t.value)).textures || {};
    return {
      skin: tex.SKIN ? tex.SKIN.url : null,
      fina: Boolean(tex.SKIN && tex.SKIN.metadata && tex.SKIN.metadata.model === 'slim'),
      capa: tex.CAPE ? tex.CAPE.url : null,
    };
  } catch {
    return null;
  }
}

export const onRequestGet = withQuotaHandling(async (context) => {
  const nombre = String(context.params.nombre || '');
  if (!NOMBRE_MC.test(nombre)) return jsonResponse({ error: 'Nombre no válido.' }, 400);
  const url = new URL(`/api/jugador/${nombre.toLowerCase()}`, context.request.url).toString();
  return cachedPublicJson(context, url, 120, async () => {
    let j;
    try {
      j = await d1First(context.env,
        `SELECT ${COLUMNAS}, j.skin_url, j.capa_mojang, j.capa_dx, j.aspecto_at
         FROM jugadores j WHERE j.nombre_lower = ? AND j.ultima_vez IS NOT NULL`, [nombre.toLowerCase()]);
    } catch {
      // sin la migración 0019 todavía
      j = await d1First(context.env,
        `SELECT ${COLUMNAS} FROM jugadores j WHERE j.nombre_lower = ? AND j.ultima_vez IS NOT NULL`, [nombre.toLowerCase()]);
    }
    if (!j) return { existe: false, nombre };
    const online = await d1First(context.env, `SELECT valor, updated_at FROM servidor_estado WHERE clave = 'online'`);
    let conectado = null;
    if (online && Date.now() - Date.parse(`${online.updated_at.replace(' ', 'T')}Z`) < 12 * 60000) {
      try {
        for (const [srv, lista] of Object.entries(JSON.parse(online.valor) || {})) {
          if (Array.isArray(lista) && lista.some((n) => String(n).toLowerCase() === j.nombre.toLowerCase())) conectado = srv;
        }
      } catch { /* sin datos */ }
    }
    const capas = await capasDe(context.env, j.nombre, d1Select);
    // aspecto: lo guardado por el servidor y, si no hay, lo de Mojang (cuentas con Minecraft)
    let aspecto = null;
    if (j.aspecto_at) {
      aspecto = { skin: idTextura(j.skin_url), capa: idTextura(j.capa_mojang), dx: j.capa_dx && capas.includes(j.capa_dx) ? j.capa_dx : null, visto: j.aspecto_at };
    } else {
      const m = await aspectoMojang(j.uuid);
      if (m) aspecto = { skin: idTextura(m.skin), capa: idTextura(m.capa), dx: null, fina: m.fina, visto: null };
    }
    return {
      existe: true, nombre: j.nombre, uuid: j.uuid,
      primeraVez: j.primera_vez, ultimaVez: j.ultima_vez, minutos: j.minutos, puesto: j.minutos > 0 ? j.puesto : null,
      clan: j.clan_siglas ? { siglas: j.clan_siglas, nombre: j.clan_nombre } : null,
      conectado,
      capas,
      aspecto,
    };
  });
});
