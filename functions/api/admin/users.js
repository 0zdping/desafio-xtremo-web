import { requirePermission, jsonResponse, withQuotaHandling } from '../../../backend/lib/adminGuard.js';
import { d1Select } from '../../../backend/lib/db.js';

export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermission(request, env, 'panel.access');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();

  let users;
  if (q) {
    users = await d1Select(
      env,
      `SELECT id, username, avatar FROM users WHERE id = ? OR username LIKE ? ORDER BY username LIMIT 25`,
      [q, `%${q}%`]
    );
  } else {
    users = await d1Select(env, `SELECT id, username, avatar FROM users ORDER BY updated_at DESC LIMIT 25`);
  }

  if (!users.length) return jsonResponse({ users: [] });

  const placeholders = users.map(() => '?').join(',');
  const roleRows = await d1Select(
    env,
    `SELECT ur.user_id, r.id, r.name, r.color
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id IN (${placeholders})`,
    users.map((u) => u.id)
  );
  const byUser = new Map();
  for (const row of roleRows) {
    if (!byUser.has(row.user_id)) byUser.set(row.user_id, []);
    byUser.get(row.user_id).push({ id: row.id, name: row.name, color: row.color });
  }

  return jsonResponse({ users: users.map((u) => ({ ...u, roles: byUser.get(u.id) || [] })) });
});
