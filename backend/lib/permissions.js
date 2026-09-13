import { d1Select } from './db.js';

export async function getUserRolesAndPermissions(env, discordId) {
  const roles = await d1Select(
    env,
    `SELECT r.id, r.name, r.color, r.position, r.is_locked
     FROM roles r
     JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = ?
     ORDER BY r.position DESC`,
    [discordId]
  );

  if (!roles.length) return { roles: [], permissions: [] };

  const placeholders = roles.map(() => '?').join(',');
  const perms = await d1Select(
    env,
    `SELECT DISTINCT p.key
     FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     WHERE rp.role_id IN (${placeholders})`,
    roles.map((r) => r.id)
  );

  return { roles, permissions: perms.map((p) => p.key) };
}

export function hasPermission(permissions, key) {
  return Array.isArray(permissions) && permissions.includes(key);
}
