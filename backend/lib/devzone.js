/** Shared validation for Dev Zone tasks (POST create + PATCH update).
 *  Every field is optional on PATCH, so each one is validated only when
 *  present; on create the caller fills defaults first. Non-string values
 *  (a stray object or number from a hand-made request) are rejected here
 *  instead of reaching D1 and surfacing as an opaque 500. */
export const TASK_STATUSES = new Set(['no_iniciado', 'en_proceso', 'en_espera', 'terminado']);

const LIMITS = {
  title: 160,
  description: 4000,
  system: 40,
  repo: 80,
  blocked_note: 200,
  assignee_id: 60,
};

export function validateTaskFields(body, { partial }) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Cuerpo inválido.' };
  const out = {};
  for (const [field, max] of Object.entries(LIMITS)) {
    if (body[field] === undefined) continue;
    if (body[field] !== null && typeof body[field] !== 'string') return { error: `Campo "${field}" inválido.` };
    const value = (body[field] || '').trim();
    if (value.length > max) return { error: `"${field}" es demasiado largo (máx. ${max}).` };
    out[field] = value;
  }
  if (body.status !== undefined) {
    if (!TASK_STATUSES.has(body.status)) return { error: 'Estado inválido.' };
    out.status = body.status;
  }
  if (!partial || out.title !== undefined) {
    if (!out.title) return { error: 'Título inválido.' };
  }
  if (out.system !== undefined && !out.system) out.system = 'general';
  if (out.assignee_id !== undefined && !out.assignee_id) out.assignee_id = null;
  return { value: out };
}
