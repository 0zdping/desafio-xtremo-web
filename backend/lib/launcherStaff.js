// Comprobación común de los endpoints de staff del launcher: sesión del launcher + permiso.
import { jsonResponse } from './http.js';
import { getUserRolesAndPermissions, hasPermission } from './permissions.js';
import { conLauncher } from './launcherHttp.js';

export async function conStaff(request, env, permiso) {
  const { u, error } = await conLauncher(request, env);
  if (error) return { error };
  const { roles, permissions } = await getUserRolesAndPermissions(env, u.id);
  if (!roles.length || (permiso && !hasPermission(permissions, permiso))) {
    return { error: jsonResponse({ error: 'Solo para el staff.' }, 403) };
  }
  return { u, roles, permissions };
}
