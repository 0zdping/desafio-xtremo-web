// GET /api/jugador/<nombre>: perfil público de un jugador (web /jugador.html y launcher).
// Solo datos públicos: nada de rangos, sanciones ni la conexión real del staff en vanish.
import { withQuotaHandling, jsonResponse } from '../../../backend/lib/http.js';
import { d1First } from '../../../backend/lib/db.js';
import { cachedPublicJson } from '../../../backend/lib/edgeCache.js';
import { NOMBRE_MC } from '../../../backend/lib/launcher.js';

export const onRequestGet = withQuotaHandling(async (context) => {
  const nombre = String(context.params.nombre || '');
  if (!NOMBRE_MC.test(nombre)) return jsonResponse({ error: 'Nombre no válido.' }, 400);
  const url = new URL(`/api/jugador/${nombre.toLowerCase()}`, context.request.url).toString();
  return cachedPublicJson(context, url, 120, async () => {
    const j = await d1First(
      context.env,
      `SELECT j.nombre, j.uuid, j.primera_vez, j.ultima_vez, j.minutos, j.clan_siglas, j.clan_nombre,
              (SELECT COUNT(*) + 1 FROM jugadores o WHERE o.minutos > j.minutos AND o.ultima_vez IS NOT NULL) AS puesto
       FROM jugadores j WHERE j.nombre_lower = ? AND j.ultima_vez IS NOT NULL`,
      [nombre.toLowerCase()]
    );
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
    return {
      existe: true, nombre: j.nombre, uuid: j.uuid,
      primeraVez: j.primera_vez, ultimaVez: j.ultima_vez, minutos: j.minutos, puesto: j.minutos > 0 ? j.puesto : null,
      clan: j.clan_siglas ? { siglas: j.clan_siglas, nombre: j.clan_nombre } : null,
      conectado,
    };
  });
});
