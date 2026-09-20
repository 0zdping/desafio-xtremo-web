// Registro de decisiones de Dev Zone: append-only a propósito (sin PATCH/DELETE).
// Es un log de "esto se decidió, en esta fecha, por esta razón" — igual que un
// commit no se reescribe, una decisión ya tomada no se edita, se supera con una
// entrada nueva si cambia. Evita reescribir contexto que otro developer ya leyó.
import {
  requirePermission,
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../backend/lib/adminGuard.js';
import { d1Select, d1Run, d1First } from '../../../backend/lib/db.js';
import { stripDangerousHtml } from '../../../backend/lib/sanitizeHtml.js';

export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermission(request, env, 'devzone.access');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const decisions = await d1Select(
    env,
    `SELECT d.id, d.title, d.body, d.system, d.author_id, d.created_at, u.username AS author_name
     FROM devzone_decisions d LEFT JOIN users u ON u.id = d.author_id
     ORDER BY d.created_at DESC`
  );
  return jsonResponse({ decisions });
});

export const onRequestPost = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'devzone.manage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const body = await request.json().catch(() => null);
  const title = (body?.title || '').trim();
  const system = (body?.system || 'general').trim() || 'general';
  const rawText = typeof body?.body === 'string' ? body.body : '';

  if (!title || title.length > 160) return jsonResponse({ error: 'Título inválido.' }, 400);
  if (system.length > 40) return jsonResponse({ error: 'Sistema inválido.' }, 400);

  const text = await stripDangerousHtml(rawText);

  const insert = await d1Run(
    env,
    `INSERT INTO devzone_decisions (title, body, system, author_id) VALUES (?, ?, ?, ?)`,
    [title, text, system, guard.user.id]
  );
  const decision = await d1First(env, `SELECT * FROM devzone_decisions WHERE id = ?`, [insert.meta.last_row_id]);
  return jsonResponse({ decision }, 201);
});
