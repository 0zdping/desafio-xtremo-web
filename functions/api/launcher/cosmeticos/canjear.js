// POST /api/launcher/cosmeticos/canjear: SOLO DXAirdrops desde el servidor del Desafío (firmado con
// DX_AIRDROPS_PUBLICA). Un jugador ha usado un cupón de airdrop: se apunta el cosmético en su cuenta.
//   { codigo, cosmetico, uuid, nombre, origen }
// Cada código vale una vez: el mismo jugador otra vez -> { ok, ya: true } (por si se perdió la respuesta);
// otro jugador -> 409 (el objeto era una copia).
import { withQuotaHandling, jsonResponse } from '../../../../backend/lib/http.js';
import { d1First, d1Run } from '../../../../backend/lib/db.js';
import { firmaServidorValida, NOMBRE_MC, UUID_MC } from '../../../../backend/lib/launcher.js';
import { leerJson } from '../../../../backend/lib/launcherHttp.js';
import { purgeEdgeCache } from '../../../../backend/lib/edgeCache.js';
import { COSMETICOS, esCapa } from '../../../../backend/lib/cosmeticos.js';

const CODIGO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const onRequestPost = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const { texto, datos } = await leerJson(request, 2000);
  if (!(await firmaServidorValida(request, env, texto, env.DX_AIRDROPS_PUBLICA))) return jsonResponse({ error: 'Firma no válida.' }, 401);
  const d = datos && typeof datos === 'object' ? datos : {};
  const codigo = String(d.codigo || '').toLowerCase();
  const cosmetico = String(d.cosmetico || '');
  const nombre = String(d.nombre || '');
  const uuid = String(d.uuid || '').toLowerCase();
  if (!CODIGO.test(codigo) || !NOMBRE_MC.test(nombre) || !UUID_MC.test(uuid)) return jsonResponse({ error: 'Datos no válidos.' }, 400);
  if (!COSMETICOS[cosmetico]) return jsonResponse({ error: 'Ese cosmético no existe en el launcher.' }, 400);

  const usado = await d1First(env, `SELECT uuid FROM launcher_cosmeticos WHERE codigo = ?`, [codigo]);
  if (usado) {
    if (usado.uuid === uuid) return jsonResponse({ ok: true, ya: true });
    return jsonResponse({ error: 'Ese cupón ya está canjeado.' }, 409);
  }
  const yaLoTenia = await d1First(env, `SELECT 1 AS si FROM launcher_cosmeticos WHERE nombre = ? AND cosmetico = ? LIMIT 1`, [nombre, cosmetico]);
  const origen = String(d.origen || 'airdrop').slice(0, 24);
  await d1Run(env, `INSERT OR IGNORE INTO launcher_cosmeticos (codigo, nombre, uuid, cosmetico, origen) VALUES (?, ?, ?, ?, ?)`,
    [codigo, nombre, uuid, cosmetico, origen]);

  const base = new URL(request.url).origin;
  const urls = [`${base}/api/launcher/cosmeticos`, `${base}/api/jugador/${nombre.toLowerCase()}`];
  if (esCapa(cosmetico)) urls.push(`${base}/api/launcher/capas`);
  await purgeEdgeCache(context, urls);
  return jsonResponse({ ok: true, ya: Boolean(yaLoTenia) }, yaLoTenia ? 200 : 201);
});
