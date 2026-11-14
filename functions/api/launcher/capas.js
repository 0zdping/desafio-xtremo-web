// GET /api/launcher/capas: quién puede llevar cada capa exclusiva del launcher (por nombre de
// Minecraft). Lo leen el launcher (para ofrecerla) y DX Models (para no enseñar a los demás una
// capa que el jugador no tiene). Público, caché 2 min; el panel lo purga al cambiarlo.
import { withQuotaHandling } from '../../../backend/lib/http.js';
import { d1Select } from '../../../backend/lib/db.js';
import { cachedPublicJson } from '../../../backend/lib/edgeCache.js';

export const onRequestGet = withQuotaHandling(async (context) => {
  return cachedPublicJson(context, context.request.url, 120, async () => {
    const filas = await d1Select(context.env, `SELECT nombre, capa FROM launcher_capas ORDER BY capa, nombre`);
    const capas = {};
    for (const f of filas) (capas[f.capa] = capas[f.capa] || []).push(f.nombre);
    return { capas };
  });
});
