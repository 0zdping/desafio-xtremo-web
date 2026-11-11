// GET  /api/launcher/servidor: estado público para el launcher (¿Desafío abierto?). Caché de borde 60 s.
// POST /api/launcher/servidor: SOLO el proxy (firmado con su clave Ed25519) publica el estado.
import { withQuotaHandling, jsonResponse } from '../../../backend/lib/http.js';
import { d1Select, d1Run } from '../../../backend/lib/db.js';
import { cachedPublicJson, purgeEdgeCache } from '../../../backend/lib/edgeCache.js';
import { firmaServidorValida } from '../../../backend/lib/launcher.js';
import { leerJson } from '../../../backend/lib/launcherHttp.js';

export const onRequestGet = withQuotaHandling(async (context) => {
  return cachedPublicJson(context, context.request.url, 60, async () => {
    const filas = await d1Select(context.env, `SELECT clave, valor, updated_at FROM servidor_estado WHERE clave IN ('desafio')`);
    const d = filas.find((f) => f.clave === 'desafio');
    return { desafio: d ? d.valor : 'desconocido', actualizado: d ? d.updated_at : null };
  });
});

export const onRequestPost = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const { texto, datos } = await leerJson(request);
  if (!(await firmaServidorValida(request, env, texto))) return jsonResponse({ error: 'Firma no válida.' }, 401);
  if (!datos || !['abierto', 'cerrado'].includes(datos.desafio)) return jsonResponse({ error: 'Datos no válidos.' }, 400);
  await d1Run(
    env,
    `INSERT INTO servidor_estado (clave, valor, updated_at) VALUES ('desafio', ?, datetime('now'))
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, updated_at = excluded.updated_at`,
    [datos.desafio]
  );
  await purgeEdgeCache(context, [new URL('/api/launcher/servidor', request.url).toString()]);
  return jsonResponse({ ok: true });
});
