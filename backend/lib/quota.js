/** Self-tracked usage guard against Cloudflare's free-tier daily limits.
 *  We don't have real-time access to Cloudflare's own billing counters from
 *  inside a Worker/Pages Function, so we keep our own counters in KV (reset
 *  daily) and refuse to proceed once we're within 1 unit of a limit — i.e.
 *  we never actually spend the very last free unit, on purpose. */
export const QUOTA_LIMITS = {
  d1_reads: 5000000,
  d1_writes: 100000,
  kv_reads: 100000,
  kv_writes: 1000,
  kv_deletes: 1000,
};

function todayKey(resource) {
  const day = new Date().toISOString().slice(0, 10);
  return `usage:${resource}:${day}`;
}

/** Check whether `resource` still has headroom. Does not consume anything —
 *  call addUsage() after the real operation completes with its actual cost. */
export async function checkQuota(env, resource) {
  const limit = QUOTA_LIMITS[resource];
  if (!limit) return { allowed: true, current: 0, limit: null };
  const raw = await env.SESSIONS.get(todayKey(resource));
  const current = parseInt(raw || '0', 10);
  return { allowed: current < limit - 1, current, limit };
}

export async function addUsage(env, resource, amount) {
  const limit = QUOTA_LIMITS[resource];
  if (!limit || !amount) return;
  const key = todayKey(resource);
  const raw = await env.SESSIONS.get(key);
  const current = parseInt(raw || '0', 10);
  await env.SESSIONS.put(key, String(current + amount), { expirationTtl: 60 * 60 * 26 });
}

export async function getUsageSnapshot(env) {
  const out = {};
  for (const resource of Object.keys(QUOTA_LIMITS)) {
    const raw = await env.SESSIONS.get(todayKey(resource));
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
