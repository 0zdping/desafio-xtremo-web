import {
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../../../backend/lib/adminGuard.js';
import { d1Select, d1Run, d1First } from '../../../../../backend/lib/db.js';

const DISCORD_ID = /^\d{15,25}$/;

export const onRequestPost = withQuotaHandling(async (context) => {
  const { request, env, params } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'panel.manage_roles');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const userId = params.id;
  if (!DISCORD_ID.test(userId)) return jsonResponse({ error: 'ID de Discord inválido.' }, 400);

  const body = await request.json().catch(() => null);
  const roleId = Number(body?.roleId);
  if (!Number.isInteger(roleId)) return jsonResponse({ error: 'Rango inválido.' }, 400);

  const role = await d1First(env, `SELECT id FROM roles WHERE id = ?`, [roleId]);
  if (!role) return jsonResponse({ error: 'Rango no encontrado.' }, 404);

  // Allow assigning a role to a Discord ID that hasn't logged in yet — seed a
  // stub profile row so the FK/reporting stays consistent; the real login
  // callback will fill in username/avatar the first time they sign in.
  await d1Run(
    env,
    `INSERT INTO users (id, username, avatar) VALUES (?, NULL, NULL)
     ON CONFLICT(id) DO NOTHING`,
    [userId]
  );

  await d1Run(env, `INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`, [userId, roleId]);

  const roles = await d1Select(
    env,
    `SELECT r.id, r.name, r.color FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ?`,
    [userId]
  );
  return jsonResponse({ roles }, 201);
});
