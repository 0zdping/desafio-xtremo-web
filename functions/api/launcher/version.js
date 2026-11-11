// GET /api/launcher/version: última versión publicada del launcher (lee launcher/latest.json del
// bucket MEDIA). GET /api/launcher/version?descargar redirige al instalador.
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
  if (!/^https:\/\/media\.desafioxtremo\.site\/launcher\//.test(info.url || '')) return jsonResponse({ error: 'Enlace no válido.' }, 500);
  if (new URL(request.url).searchParams.has('descargar')) {
    return new Response(null, { status: 302, headers: { Location: info.url, 'Cache-Control': 'no-store' } });
  }
  return jsonResponse(
    { version: info.version, tamano: info.tamano, notas: info.notas || '', descarga: '/api/launcher/version?descargar' },
    200,
    { 'Cache-Control': 'public, max-age=120' }
  );
});
