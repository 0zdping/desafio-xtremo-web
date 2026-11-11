// GET /api/launcher/online: quién está conectado ahora y en qué servidor (lo publica el proxy
// cada 5 minutos en POST /api/launcher/actividad, que purga esta caché). Público.
import { withQuotaHandling } from '../../../backend/lib/http.js';
import { d1First } from '../../../backend/lib/db.js';
import { cachedPublicJson } from '../../../backend/lib/edgeCache.js';

export const onRequestGet = withQuotaHandling(async (context) => {
  return cachedPublicJson(context, context.request.url, 60, async () => {
    const f = await d1First(context.env, `SELECT valor, updated_at FROM servidor_estado WHERE clave = 'online'`);
    // Si el proxy lleva más de 12 minutos sin publicar, la red está apagada o sin conexión.
    const fresco = f && Date.now() - Date.parse(`${f.updated_at.replace(' ', 'T')}Z`) < 12 * 60000;
    if (!fresco) return { disponible: false, total: 0, servidores: {} };
    let servidores = {};
    try { servidores = JSON.parse(f.valor) || {}; } catch { servidores = {}; }
    const total = Object.values(servidores).reduce((n, l) => n + (Array.isArray(l) ? l.length : 0), 0);
    return { disponible: true, total, servidores, actualizado: f.updated_at };
  });
});
