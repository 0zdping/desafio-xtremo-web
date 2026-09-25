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

/** Role hierarchy used by every role-management endpoint.
 *  - Holders of a locked role (Owner / Co-Owner) outrank everything.
 *  - Everyone else can only create, edit, delete, assign or remove roles
 *    strictly below their own highest role position, and can never touch
 *    a locked role.
 *  Without this, anyone with `panel.manage_roles` could grant themselves
 *  Owner, strip Owner from the real owners, or mint a role with every
 *  permission in the system. */
export function actorRank(roles) {
  if (!Array.isArray(roles) || !roles.length) return -Infinity;
  if (roles.some((r) => r.is_locked)) return Infinity;
  return Math.max(...roles.map((r) => Number(r.position) || 0));
}

export function canManageRole(actorRoles, role) {
  if (!role) return false;
  const rank = actorRank(actorRoles);
  if (rank === Infinity) return true;
  if (role.is_locked) return false;
  return (Number(role.position) || 0) < rank;
}

/** Non-owners may only hand out permissions they hold themselves. */
export function grantablePermissions(actorRoles, actorPermissions, requestedKeys) {
  if (actorRank(actorRoles) === Infinity) return { ok: true };
  const own = new Set(actorPermissions || []);
  const extra = (requestedKeys || []).filter((k) => !own.has(k));
  return extra.length ? { ok: false, extra } : { ok: true };
}

/** Full check for assigning a role to / removing it from a user. On top of
 *  canManageRole, a non-owner can't:
 *   - hand out (to anyone, themselves included) a role carrying permissions
 *     they don't hold, which would otherwise let them "borrow" permissions
 *     through any lower role an owner configured, and
 *   - change the roles of someone ranked at or above them.
 *  Returns null when allowed, or an error message. */
export async function roleChangeError(env, guard, role, targetUserId) {
  if (!canManageRole(guard.roles, role)) return 'Solo puedes gestionar rangos por debajo del tuyo.';
  const rank = actorRank(guard.roles);
  if (rank === Infinity) return null;
  const rows = await d1Select(
    env,
    `SELECT p.key FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = ?`,
    [role.id]
  );
  const grant = grantablePermissions(guard.roles, guard.permissions, rows.map((r) => r.key));
  if (!grant.ok) return `Ese rango incluye permisos que tú no tienes: ${grant.extra.join(', ')}.`;
  if (String(targetUserId) !== String(guard.user.id)) {
    const target = await getUserRolesAndPermissions(env, targetUserId);
    if (actorRank(target.roles) >= rank) return 'No puedes cambiar los rangos de alguien de tu nivel o superior.';
  }
  return null;
}
