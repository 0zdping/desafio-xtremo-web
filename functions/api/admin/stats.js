import { requirePermission, jsonResponse, withQuotaHandling } from '../../../backend/lib/adminGuard.js';
import { d1Select, d1First } from '../../../backend/lib/db.js';

const RANGE_DAYS = { today: 0, '7d': 7, '30d': 30, '90d': 90 };

function toSqlDate(d) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function rangeBounds(range) {
  const days = Object.prototype.hasOwnProperty.call(RANGE_DAYS, range) ? RANGE_DAYS[range] : 7;
  const cutoff = new Date();
  if (days === 0) cutoff.setUTCHours(0, 0, 0, 0);
  else cutoff.setUTCDate(cutoff.getUTCDate() - days);

  const span = Date.now() - cutoff.getTime();
  const prevCutoff = new Date(cutoff.getTime() - span);

  return { cutoff: toSqlDate(cutoff), prevCutoff: toSqlDate(prevCutoff) };
}

export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env } = context;
  const guard = await requirePermission(request, env, 'panel.view_stats');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const url = new URL(request.url);
  const range = url.searchParams.get('range') || '7d';
  const { cutoff, prevCutoff } = rangeBounds(range);

  const [totals, prevTotals, daily, topPages, topClicks, referrers, devices, countries] = await Promise.all([
    d1First(
      env,
      `SELECT
         SUM(CASE WHEN type = 'pageview' THEN 1 ELSE 0 END) as pageviews,
         SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END) as clicks,
         COUNT(DISTINCT CASE WHEN type = 'pageview' THEN visitor_hash END) as uniques
       FROM analytics_events WHERE created_at >= ?`,
      [cutoff]
    ),
    d1First(
      env,
      `SELECT
         SUM(CASE WHEN type = 'pageview' THEN 1 ELSE 0 END) as pageviews,
         SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END) as clicks,
         COUNT(DISTINCT CASE WHEN type = 'pageview' THEN visitor_hash END) as uniques
       FROM analytics_events WHERE created_at >= ? AND created_at < ?`,
      [prevCutoff, cutoff]
    ),
    d1Select(
      env,
      `SELECT date(created_at) as day,
         SUM(CASE WHEN type = 'pageview' THEN 1 ELSE 0 END) as views,
         COUNT(DISTINCT CASE WHEN type = 'pageview' THEN visitor_hash END) as uniques
       FROM analytics_events WHERE created_at >= ?
       GROUP BY day ORDER BY day`,
      [cutoff]
    ),
    d1Select(
      env,
      `SELECT path, COUNT(*) as views, COUNT(DISTINCT visitor_hash) as uniques
       FROM analytics_events WHERE type = 'pageview' AND created_at >= ?
       GROUP BY path ORDER BY views DESC LIMIT 8`,
      [cutoff]
    ),
    d1Select(
      env,
      `SELECT target, COUNT(*) as clicks
       FROM analytics_events WHERE type = 'click' AND target IS NOT NULL AND created_at >= ?
       GROUP BY target ORDER BY clicks DESC LIMIT 8`,
      [cutoff]
    ),
    d1Select(
      env,
      `SELECT referrer, COUNT(*) as views
       FROM analytics_events WHERE type = 'pageview' AND created_at >= ?
       GROUP BY referrer ORDER BY views DESC LIMIT 6`,
      [cutoff]
    ),
    d1Select(
      env,
      `SELECT device, COUNT(*) as views
       FROM analytics_events WHERE type = 'pageview' AND created_at >= ?
       GROUP BY device`,
      [cutoff]
    ),
    d1Select(
      env,
      `SELECT country, COUNT(*) as views
       FROM analytics_events WHERE type = 'pageview' AND created_at >= ? AND country IS NOT NULL
       GROUP BY country ORDER BY views DESC LIMIT 6`,
      [cutoff]
    ),
  ]);

  return jsonResponse({
    range,
    totals: {
      pageviews: totals?.pageviews || 0,
      clicks: totals?.clicks || 0,
      uniques: totals?.uniques || 0,
    },
    previous: {
      pageviews: prevTotals?.pageviews || 0,
      clicks: prevTotals?.clicks || 0,
      uniques: prevTotals?.uniques || 0,
    },
    daily,
    topPages,
    topClicks,
    referrers,
    devices,
    countries,
  });
});
