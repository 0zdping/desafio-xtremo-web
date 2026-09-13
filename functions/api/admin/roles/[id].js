import {
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../../backend/lib/adminGuard.js';
import { d1Select, d1Run, d1First } from '../../../../backend/lib/db.js';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const onRequestPatch = withQuotaHandling(async (context) => {
  const { request, env, params } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'panel.manage_roles');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const roleId = Number(params.id);
  if (!Number.isInteger(roleId)) return jsonResponse({ error: 'Rango inválido.' }, 400);

  const role = await d1First(env, `SELECT id, is_locked FROM roles WHERE id = ?`, [roleId]);
  if (!role) return jsonResponse({ error: 'Rango no encontrado.' }, 404);
  if (role.is_locked) {
    return jsonResponse({ error: 'Este rango no se puede modificar.' }, 400);
  }

  const body = await request.json().catch(() => null);
  const name = (body?.name || '').trim();
  const color = (body?.color || '').trim();
  const position = Number.isFinite(body?.position) ? Math.trunc(body.position) : 0;
  const permissionKeys = Array.isArray(body?.permissionKeys) ? body.permissionKeys : [];

  if (!name || name.length > 40) return jsonResponse({ error: 'Nombre inválido.' }, 400);
  if (!HEX_COLOR.test(color)) return jsonResponse({ error: 'Color inválido (usa formato #RRGGBB).' }, 400);

  const dupe = await d1First(env, `SELECT id FROM roles WHERE name = ? AND id != ?`, [name, roleId]);
  if (dupe) return jsonResponse({ error: 'Ya existe un rango con ese nombre.' }, 409);

  await d1Run(env, `UPDATE roles SET name = ?, color = ?, position = ? WHERE id = ?`, [
    name,
    color,
    position,
    roleId,
  ]);

  await d1Run(env, `DELETE FROM role_permissions WHERE role_id = ?`, [roleId]);
  if (permissionKeys.length) {
    const known = await d1Select(
      env,
      `SELECT id FROM permissions WHERE key IN (${permissionKeys.map(() => '?').join(',')})`,
      permissionKeys
    );
    for (const perm of known) {
      await d1Run(env, `INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`, [
        roleId,
        perm.id,
      ]);
    }
  }

  return jsonResponse({ ok: true });
});

export const onRequestDelete = withQuotaHandling(async (context) => {
  const { request, env, params } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'panel.manage_roles');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const roleId = Number(params.id);
  if (!Number.isInteger(roleId)) return jsonResponse({ error: 'Rango inválido.' }, 400);

  const role = await d1First(env, `SELECT id, is_locked FROM roles WHERE id = ?`, [roleId]);
  if (!role) return jsonResponse({ error: 'Rango no encontrado.' }, 404);
  if (role.is_locked) {
    return jsonResponse({ error: 'Este rango no se puede eliminar.' }, 400);
  }

  await d1Run(env, `DELETE FROM roles WHERE id = ?`, [roleId]);
  return jsonResponse({ ok: true });
});
