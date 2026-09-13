import {
  requirePermission,
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../backend/lib/adminGuard.js';
import { d1Select, d1Run } from '../../../backend/lib/db.js';

async function loadRolesWithPermissions(env) {
  const roles = await d1Select(
    env,
    `SELECT id, name, color, position, is_locked FROM roles ORDER BY position DESC, name`
  );
  if (!roles.length) return [];

  const rolePerms = await d1Select(
    env,
    `SELECT rp.role_id, p.key
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id`
  );
  const byRole = new Map();
  for (const row of rolePerms) {
    if (!byRole.has(row.role_id)) byRole.set(row.role_id, []);
    byRole.get(row.role_id).push(row.key);
  }
  return roles.map((r) => ({ ...r, is_locked: !!r.is_locked, permissions: byRole.get(r.id) || [] }));
}

export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermission(request, env, 'panel.access');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const roles = await loadRolesWithPermissions(env);
  return jsonResponse({ roles });
});

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const onRequestPost = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'panel.manage_roles');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const body = await request.json().catch(() => null);
  const name = (body?.name || '').trim();
  const color = (body?.color || '').trim();
  const position = Number.isFinite(body?.position) ? Math.trunc(body.position) : 0;
  const permissionKeys = Array.isArray(body?.permissionKeys) ? body.permissionKeys : [];

  if (!name || name.length > 40) return jsonResponse({ error: 'Nombre inválido.' }, 400);
  if (!HEX_COLOR.test(color)) return jsonResponse({ error: 'Color inválido (usa formato #RRGGBB).' }, 400);

  const existing = await d1Select(env, `SELECT id FROM roles WHERE name = ?`, [name]);
  if (existing.length) return jsonResponse({ error: 'Ya existe un rango con ese nombre.' }, 409);

  const insert = await d1Run(
    env,
    `INSERT INTO roles (name, color, position, is_locked) VALUES (?, ?, ?, 0)`,
    [name, color, position]
  );
  const roleId = insert.meta.last_row_id;

  if (permissionKeys.length) {
    const known = await d1Select(
      env,
      `SELECT id, key FROM permissions WHERE key IN (${permissionKeys.map(() => '?').join(',')})`,
      permissionKeys
    );
    for (const perm of known) {
      await d1Run(env, `INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`, [
        roleId,
        perm.id,
      ]);
    }
  }

  const roles = await loadRolesWithPermissions(env);
  return jsonResponse({ roles }, 201);
});
