/** Self-tracked usage guard against Cloudflare's free-tier daily/monthly limits.
 *  We don't have real-time access to Cloudflare's own billing counters from
 *  inside a Worker/Pages Function, so we keep our own counters in KV (reset
 *  daily or monthly depending on the resource) and refuse to proceed once
 *  we're within 1 unit of a limit — i.e. we never actually spend the very
 *  last free unit, on purpose. */
export const QUOTA_LIMITS = {
  d1_reads: 5000000,
  d1_writes: 100000,
  kv_reads: 100000,
  kv_writes: 1000,
  kv_deletes: 1000,
  // R2 free tier: 1M Class A ops (writes/deletes/lists) and 10M Class B ops
  // (reads) per month. We stay under those with the same margin-of-one rule.
  r2_class_a: 900000,
  r2_class_b: 9000000,
};

/** Resources not listed here reset daily by default. */
export const QUOTA_PERIOD = {
  r2_class_a: 'month',
  r2_class_b: 'month',
};

function periodKey(resource) {
  const period = QUOTA_PERIOD[resource] || 'day';
  const now = new Date();
  if (period === 'month') {
    const month = now.toISOString().slice(0, 7); // YYYY-MM
    return `usage:${resource}:${month}`;
  }
  const day = now.toISOString().slice(0, 10); // YYYY-MM-DD
  return `usage:${resource}:${day}`;
}

function periodTtl(resource) {
  const period = QUOTA_PERIOD[resource] || 'day';
  return period === 'month' ? 60 * 60 * 24 * 32 : 60 * 60 * 26;
}

// Kept as an alias in case anything else imports the old name directly.
export const todayKey = periodKey;

/** Check whether `resource` still has headroom. Does not consume anything —
 *  call addUsage() after the real operation completes with its actual cost. */
export async function checkQuota(env, resource) {
  const limit = QUOTA_LIMITS[resource];
  if (!limit) return { allowed: true, current: 0, limit: null };
  const raw = await env.SESSIONS.get(periodKey(resource));
  const current = parseInt(raw || '0', 10);
  return { allowed: current < limit - 1, current, limit };
}

export async function addUsage(env, resource, amount) {
  const limit = QUOTA_LIMITS[resource];
  if (!limit || !amount) return;
  const key = periodKey(resource);
  const raw = await env.SESSIONS.get(key);
  const current = parseInt(raw || '0', 10);
  await env.SESSIONS.put(key, String(current + amount), { expirationTtl: periodTtl(resource) });
}

export async function getUsageSnapshot(env) {
  const out = {};
  for (const resource of Object.keys(QUOTA_LIMITS)) {
    const raw = await env.SESSIONS.get(periodKey(resource));
    out[resource] = { current: parseInt(raw || '0', 10), limit: QUOTA_LIMITS[resource] };
  }
  return out;
}

export class QuotaExceededError extends Error {
  constructor(resource) {
    super(`quota_exceeded:${resource}`);
    this.resource = resource;
  }
}
