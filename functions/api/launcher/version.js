// GET /api/launcher/version: última versión publicada del launcher (lee launcher/latest.json del
// bucket MEDIA). GET /api/launcher/version?descargar redirige al instalador de Windows y
// ?descargar=mac-arm64 / ?descargar=mac-x64 al .dmg de Mac (Apple Silicon / Intel).
// La firma de latest.json la comprueba cada launcher; aquí solo se muestra y se enlaza.
import { withQuotaHandling, jsonResponse } from '../../../backend/lib/http.js';

export const onRequestGet = withQuotaHandling(async ({ request, env }) => {
  if (!env.MEDIA) return jsonResponse({ error: 'No disponible.' }, 503);
  const obj = await env.MEDIA.get('launcher/latest.json');
  if (!obj) return jsonResponse({ error: 'Todavía no hay ninguna versión publicada.' }, 404);
  let info;
  try {
    const sobre = JSON.parse(await obj.text());
    info = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(sobre.datos), (c) => c.charCodeAt(0))));
  } catch {
    return jsonResponse({ error: 'Versión publicada ilegible.' }, 500);
  }
  const valida = (u) => /^https:\/\/media\.desafioxtremo\.site\/launcher\//.test(u || '');
  if (!valida(info.url)) return jsonResponse({ error: 'Enlace no válido.' }, 500);
  const mac = {};
  for (const a of ['arm64', 'x64']) if (info.mac && info.mac[a] && valida(info.mac[a].url)) mac[a] = info.mac[a];
  const params = new URL(request.url).searchParams;
  if (params.has('descargar')) {
    const que = params.get('descargar');
    const destino = que === 'mac-arm64' ? mac.arm64 && mac.arm64.url : que === 'mac-x64' ? mac.x64 && mac.x64.url : info.url;
    if (!destino) return jsonResponse({ error: 'Esta versión todavía no está para ese sistema.' }, 404);
    return new Response(null, { status: 302, headers: { Location: destino, 'Cache-Control': 'no-store' } });
  }
  return jsonResponse(
    {
      version: info.version, tamano: info.tamano, notas: info.notas || '', descarga: '/api/launcher/version?descargar',
      mac: Object.fromEntries(Object.entries(mac).map(([a, m]) => [a, { tamano: m.tamano, descarga: `/api/launcher/version?descargar=mac-${a}` }])),
    },
    200,
    { 'Cache-Control': 'public, max-age=120' }
  );
});
