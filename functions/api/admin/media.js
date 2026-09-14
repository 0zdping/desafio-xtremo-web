import {
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../backend/lib/adminGuard.js';
import { putMediaImage } from '../../../backend/lib/media.js';
import { QuotaExceededError } from '../../../backend/lib/quota.js';

export const onRequestPost = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'announcements.manage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const form = await request.formData().catch(() => null);
  if (!form) return jsonResponse({ error: 'Formulario inválido.' }, 400);

  const file = form.get('file');
  if (!file || typeof file === 'string') return jsonResponse({ error: 'Falta el archivo.' }, 400);

  let uploaded;
  try {
    uploaded = await putMediaImage(env, file);
  } catch (err) {
    if (err instanceof QuotaExceededError) throw err;
    return jsonResponse({ error: err.message || 'Error al subir la imagen.' }, 400);
  }

  return jsonResponse({ url: uploaded.url, key: uploaded.key }, 201);
});
