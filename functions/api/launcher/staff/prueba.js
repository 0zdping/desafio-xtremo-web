// POST /api/launcher/staff/prueba: adjuntar una prueba (captura o vídeo) a una sanción desde el
// launcher. Sesión del launcher + permiso sanctions.access. Mismo almacenamiento privado (R2
// EVIDENCE) y mismas comprobaciones de tipo real que el panel de la web.
import { withQuotaHandling, jsonResponse } from '../../../../backend/lib/http.js';
import { d1First, d1Run } from '../../../../backend/lib/db.js';
import { getUserRolesAndPermissions, hasPermission } from '../../../../backend/lib/permissions.js';
import { putEvidence } from '../../../../backend/lib/r2Evidence.js';
import { conLauncher } from '../../../../backend/lib/launcherHttp.js';

export const onRequestPost = withQuotaHandling(async ({ request, env }) => {
  const { u, error } = await conLauncher(request, env);
  if (error) return error;
  const { permissions } = await getUserRolesAndPermissions(env, u.id);
  if (!hasPermission(permissions, 'sanctions.access')) return jsonResponse({ error: 'No tienes acceso a sanciones.' }, 403);
  const form = await request.formData().catch(() => null);
  if (!form) return jsonResponse({ error: 'Formulario inválido.' }, 400);
  const id = Number(form.get('sancion'));
  const file = form.get('archivo');
  if (!Number.isInteger(id) || !file || typeof file !== 'object') return jsonResponse({ error: 'Faltan datos.' }, 400);
  const s = await d1First(env, `SELECT id FROM sanctions WHERE id = ?`, [id]);
  if (!s) return jsonResponse({ error: 'Esa sanción no existe.' }, 404);
  const n = await d1First(env, `SELECT COUNT(*) AS n FROM sanction_evidence WHERE sanction_id = ?`, [id]);
  if (n && n.n >= 12) return jsonResponse({ error: 'Esa sanción ya tiene el máximo de pruebas.' }, 400);
  try {
    const up = await putEvidence(env, id, file);
    await d1Run(
      env,
      `INSERT INTO sanction_evidence (sanction_id, r2_key, content_type, filename, size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, up.key, up.contentType, up.filename, up.size, u.id]
    );
    return jsonResponse({ ok: true });
  } catch (e) {
    return jsonResponse({ error: e.message || 'No se pudo subir la prueba.' }, 400);
  }
});
