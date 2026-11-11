// GET /api/launcher/ranking: los que más han jugado (minutos que suma el proxy). Público, caché 5 min.
import { withQuotaHandling } from '../../../backend/lib/http.js';
import { d1Select } from '../../../backend/lib/db.js';
import { cachedPublicJson } from '../../../backend/lib/edgeCache.js';

export const onRequestGet = withQuotaHandling(async (context) => {
  return cachedPublicJson(context, context.request.url, 300, async () => {
    const filas = await d1Select(
      context.env,
      `SELECT nombre, minutos, clan_siglas FROM jugadores WHERE minutos > 0 AND ultima_vez IS NOT NULL
       ORDER BY minutos DESC LIMIT 25`
    );
    return { jugadores: filas.map((f) => ({ nombre: f.nombre, minutos: f.minutos, clan: f.clan_siglas || null })) };
  });
});
