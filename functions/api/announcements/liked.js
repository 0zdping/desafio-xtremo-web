import { parseCookie } from '../../../backend/lib/cookies.js';
import { getUserFromSession, SESSION_COOKIE } from '../../../backend/lib/session.js';
import { withQuotaHandling, jsonResponse } from '../../../backend/lib/http.js';
import { d1Select } from '../../../backend/lib/db.js';

/** Which announcements the *current* session has liked. Deliberately not
 *  behind cachedPublicJson: this is per-user and must never be served
 *  from the shared edge cache. */
export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const cookieHeader = request.headers.get('cookie');
  const sessionId = parseCookie(cookieHeader, SESSION_COOKIE);
  const user = await getUserFromSession(env, sessionId);
  if (!user) return jsonResponse({ ids: [] });

  const rows = await d1Select(env, `SELECT announcement_id FROM announcement_likes WHERE user_id = ?`, [user.id]);
  return jsonResponse({ ids: rows.map((r) => r.announcement_id) });
});
