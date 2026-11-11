// POST /api/launcher/skin: el launcher sube la skin (PNG) de una cuenta sin Minecraft para que
// SkinsRestorer la aplique con /skin url. Sin sesión (los jugadores sin premium no tienen cuenta
// en la web), así que va muy acotado: solo PNG de skin real (64x64 o 64x32), máx. 24 KB,
// limitado por IP, y guardado por su hash (subir la misma dos veces no ocupa más).
import { withQuotaHandling, jsonResponse } from '../../../backend/lib/http.js';
import { rateLimit, clientIp } from '../../../backend/lib/rateLimit.js';
import { checkQuota, addUsage, QuotaExceededError } from '../../../backend/lib/quota.js';

const MAX = 24 * 1024;
const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export const onRequestPost = withQuotaHandling(async ({ request, env }) => {
  const { allowed } = await rateLimit(env, `launcher-skin:${clientIp(request)}`, 6, 600);
  if (!allowed) return jsonResponse({ error: 'Has subido demasiadas skins. Prueba en unos minutos.' }, 429);
  if (!env.MEDIA || !env.MEDIA_PUBLIC_URL) return jsonResponse({ error: 'Almacenamiento no configurado.' }, 503);
  const largo = Number(request.headers.get('content-length') || 0);
  if (largo > MAX) return jsonResponse({ error: 'La skin pesa demasiado (máx. 24 KB).' }, 413);
  const buf = new Uint8Array(await request.arrayBuffer());
  if (buf.length > MAX || buf.length < 33) return jsonResponse({ error: 'Archivo no válido.' }, 400);
  if (!FIRMA_PNG.every((b, i) => buf[i] === b)) return jsonResponse({ error: 'La skin tiene que ser un PNG.' }, 400);
  // IHDR: ancho y alto en los bytes 16-23
  const dv = new DataView(buf.buffer);
  const ancho = dv.getUint32(16), alto = dv.getUint32(20);
  const tipo = String.fromCharCode(...buf.slice(12, 16));
  if (tipo !== 'IHDR' || ancho !== 64 || (alto !== 64 && alto !== 32)) {
    return jsonResponse({ error: 'No parece una skin de Minecraft (tiene que medir 64x64 o 64x32).' }, 400);
  }
  const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const key = `skins/${h}.png`;
  const existe = await env.MEDIA.head(key);
  if (!existe) {
    const gate = await checkQuota(env, 'r2_class_a');
    if (!gate.allowed) throw new QuotaExceededError('r2_class_a');
    await env.MEDIA.put(key, buf, { httpMetadata: { contentType: 'image/png', cacheControl: 'public, max-age=31536000, immutable' } });
    await addUsage(env, 'r2_class_a', 1);
  }
  return jsonResponse({ url: `${env.MEDIA_PUBLIC_URL.replace(/\/+$/, '')}/${key}` });
});
