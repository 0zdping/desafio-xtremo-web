// GET /api/textura/<id>: una textura de skin o capa servida desde nuestro dominio, para que el
// visor 3D del perfil la pueda leer (WebGL necesita la imagen del mismo origen o con CORS).
//   m-<hash>  -> textures.minecraft.net/texture/<hash>   (skins y capas de Mojang)
//   s-<sha>   -> skins/<sha>.png del bucket MEDIA        (skins subidas desde el launcher)
// Solo PNG pequeños. Las texturas no cambian nunca (van por hash): caché larga en el borde.
const MAX = 64 * 1024;
const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function respuesta(buf) {
  return new Response(buf, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=2592000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function onRequestGet(context) {
  const id = String(context.params.id || '');
  const m = /^m-([0-9a-f]{20,80})$/.exec(id);
  const s = /^s-([0-9a-f]{64})$/.exec(id);
  if (!m && !s) return new Response('No existe', { status: 404 });

  const cache = caches.default;
  const clave = new Request(new URL(`/api/textura/${id}`, context.request.url).toString());
  const hit = await cache.match(clave);
  if (hit) return hit;

  let buf = null;
  try {
    if (m) {
      const r = await fetch(`https://textures.minecraft.net/texture/${m[1]}`, { cf: { cacheTtl: 86400 } });
      if (r.ok) buf = new Uint8Array(await r.arrayBuffer());
    } else if (context.env.MEDIA) {
      const o = await context.env.MEDIA.get(`skins/${s[1]}.png`);
      if (o) buf = new Uint8Array(await o.arrayBuffer());
    }
  } catch {
    buf = null;
  }
  if (!buf || buf.length > MAX || buf.length < 33 || !FIRMA_PNG.every((b, i) => buf[i] === b)) {
    return new Response('No existe', { status: 404, headers: { 'Cache-Control': 'public, max-age=300' } });
  }
  const res = respuesta(buf);
  context.waitUntil(cache.put(clave, res.clone()));
  return res;
}
