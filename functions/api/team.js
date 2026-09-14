import { withQuotaHandling } from '../../backend/lib/http.js';
import { cachedPublicJson } from '../../backend/lib/edgeCache.js';
import { d1Select } from '../../backend/lib/db.js';

export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env } = context;
  return cachedPublicJson(context, request.url, 120, async () => {
    const members = await d1Select(
      env,
      `SELECT id, mc_nick, rank_label, rank_color, function_text, team, position FROM team_members ORDER BY team, position DESC`
    );
    return { members };
  });
});
