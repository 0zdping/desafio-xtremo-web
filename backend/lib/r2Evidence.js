import { checkQuota, addUsage, QuotaExceededError } from './quota.js';
import { verifyFileType } from './fileSignature.js';

export const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
export const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

function safeFileName(name) {
  const base = (name || 'archivo').replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.slice(0, 60) || 'archivo';
}

/** Uploads a single evidence file for a sanction to R2, after validating its
 *  type/size and checking our self-tracked R2 Class A (write) quota. */
export async function putEvidence(env, sanctionId, file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Tipo de archivo no permitido.');
  }
  if (file.size > MAX_SIZE) {
    throw new Error('El archivo supera el tamaño máximo permitido (8 MB).');
  }
  // Same reasoning as media.js: don't trust the declared Content-Type for
  // evidence files either: verify the real magic bytes before storing.
  if (!(await verifyFileType(file, ALLOWED_TYPES))) {
    throw new Error('El archivo no coincide con el tipo declarado.');
  }
  if (!env.EVIDENCE) {
    throw new Error('El almacenamiento de pruebas no está configurado todavía.');
  }

  const gate = await checkQuota(env, 'r2_class_a');
  if (!gate.allowed) throw new QuotaExceededError('r2_class_a');

  const safeName = safeFileName(file.name);
  const key = `sanctions/${sanctionId}/${crypto.randomUUID()}-${safeName}`;

  await env.EVIDENCE.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  await addUsage(env, 'r2_class_a', 1);

  return { key, contentType: file.type, filename: file.name, size: file.size };
}

/** Fetches a stored evidence object from R2, after checking our self-tracked
 *  R2 Class B (read) quota. Returns the R2 object, or null if it's missing. */
export async function getEvidenceObject(env, key) {
  if (!env.EVIDENCE) {
    throw new Error('El almacenamiento de pruebas no está configurado todavía.');
  }

  const gate = await checkQuota(env, 'r2_class_b');
  if (!gate.allowed) throw new QuotaExceededError('r2_class_b');

  const obj = await env.EVIDENCE.get(key);
  await addUsage(env, 'r2_class_b', 1);
  return obj;
}
