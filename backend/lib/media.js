import { checkQuota, addUsage, QuotaExceededError } from './quota.js';

export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

function safeFileName(name) {
  const base = (name || 'imagen').replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.slice(0, 60) || 'imagen';
}

/** Sube una imagen pública (portada de post o imagen intercalada en el
 *  cuerpo) al bucket MEDIA y devuelve su URL pública definitiva. A
 *  diferencia de r2Evidence.js, este bucket es público — no hay endpoint
 *  de lectura propio, el navegador pide la imagen directamente a
 *  MEDIA_PUBLIC_URL sin pasar por nuestra Function. */
export async function putMediaImage(env, file) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Tipo de imagen no permitido (solo PNG, JPEG, WEBP o GIF).');
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('La imagen supera el tamaño máximo permitido (5 MB).');
  }
  if (!env.MEDIA) {
    throw new Error('El almacenamiento de imágenes no está configurado todavía.');
  }
  if (!env.MEDIA_PUBLIC_URL) {
    throw new Error('Falta configurar la URL pública del almacenamiento de imágenes.');
  }

  const gate = await checkQuota(env, 'r2_class_a');
  if (!gate.allowed) throw new QuotaExceededError('r2_class_a');

  const safeName = safeFileName(file.name);
  const key = `posts/${crypto.randomUUID()}-${safeName}`;

  await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  await addUsage(env, 'r2_class_a', 1);

  const base = env.MEDIA_PUBLIC_URL.replace(/\/+$/, '');
  return { url: `${base}/${key}`, key };
}
