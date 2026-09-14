import {
  requirePermission,
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../backend/lib/adminGuard.js';
import { d1Select, d1Run } from '../../../backend/lib/db.js';
import { putEvidence } from '../../../backend/lib/r2Evidence.js';

const TYPES = ['ban', 'mute', 'kick', 'warn', 'other'];
const MAX_FILES = 6;

export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermission(request, env, 'sanctions.access');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const sanctions = await d1Select(env, `SELECT * FROM sanctions ORDER BY created_at DESC LIMIT 100`);
  if (!sanctions.length) return jsonResponse({ sanctions: [] });

  const placeholders = sanctions.map(() => '?').join(',');
  const evidenceRows = await d1Select(
    env,
    `SELECT id, sanction_id, content_type, filename, size, created_at FROM sanction_evidence WHERE sanction_id IN (${placeholders})`,
    sanctions.map((s) => s.id)
  );
  const byId = new Map();
  for (const row of evidenceRows) {
    if (!byId.has(row.sanction_id)) byId.set(row.sanction_id, []);
    byId.get(row.sanction_id).push({
      id: row.id,
      content_type: row.content_type,
      filename: row.filename,
      size: row.size,
      created_at: row.created_at,
    });
  }

  return jsonResponse({
    sanctions: sanctions.map((s) => ({ ...s, evidence: byId.get(s.id) || [] })),
  });
});

export const onRequestPost = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'sanctions.access');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const form = await request.formData().catch(() => null);
  if (!form) return jsonResponse({ error: 'Formulario inválido.' }, 400);

  const target_nick = (form.get('target_nick') || '').toString().trim();
  const type = (form.get('type') || '').toString().trim();
  const reason = (form.get('reason') || '').toString().trim();
  const files = form.getAll('files').filter((f) => f && typeof f === 'object' && 'size' in f);

  if (!target_nick || target_nick.length > 32) return jsonResponse({ error: 'Nick objetivo inválido.' }, 400);
  if (!TYPES.includes(type)) return jsonResponse({ error: 'Tipo de sanción inválido.' }, 400);
  if (reason.length > 2000) return jsonResponse({ error: 'Motivo demasiado largo.' }, 400);
  if (files.length > MAX_FILES) return jsonResponse({ error: `Máximo ${MAX_FILES} archivos.` }, 400);

  const insert = await d1Run(
    env,
    `INSERT INTO sanctions (target_nick, type, reason, staff_id, staff_name) VALUES (?, ?, ?, ?, ?)`,
    [target_nick, type, reason, guard.user.id, guard.user.username]
  );
  const sanctionId = insert.meta.last_row_id;

  const fileErrors = [];
  for (const file of files) {
    try {
      const uploaded = await putEvidence(env, sanctionId, file);
      await d1Run(
        env,
        `INSERT INTO sanction_evidence (sanction_id, r2_key, content_type, filename, size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)`,
        [sanctionId, uploaded.key, uploaded.contentType, uploaded.filename, uploaded.size, guard.user.id]
      );
    } catch (err) {
      fileErrors.push({ filename: file.name || 'archivo', error: err.message || 'Error al subir el archivo.' });
    }
  }

  const sanction = await d1Select(env, `SELECT * FROM sanctions WHERE id = ?`, [sanctionId]);
  return jsonResponse({ sanction: sanction[0], fileErrors }, 201);
});
