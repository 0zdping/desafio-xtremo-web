/** Self-tracked usage guard against Cloudflare's free-tier daily/monthly limits.
 *  We don't have real-time access to Cloudflare's own billing counters from
 *  inside a Worker/Pages Function, so we keep our own counters and refuse to
 *  proceed once we're within 1 unit of a limit, i.e. we never actually spend
 *  the very last free unit, on purpose.
 *
 *  Storage: D1 table `usage_counters` (migration 0009), NOT KV. The previous
 *  version did a KV.put() on every single D1 query and session read, which
 *  burned KV's 1,000 writes/day free tier after a few hundred page views and
 *  then broke logins (creating a session is a KV write). Increments are now
 *  buffered in memory per isolate and flushed in one batched UPSERT every few
 *  seconds, so the bookkeeping costs a handful of D1 writes instead of one
 *  KV write per request. Counts are advisory: a flush lost to an isolate
 *  being evicted only makes the guard slightly more permissive.
 *
 *  Every function here fails OPEN: if the counters themselves can't be read
 *  or written (e.g. migration 0009 not applied yet), the real request goes
 *  through and the guard simply stops guarding. */
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
  // Soft sub-budget for writes anonymous visitors can trigger (analytics
  // beacon, post view counters). It is spent out of the same D1 write
  // quota but stops at 40% of it, so hostile or just heavy public traffic
  // can never block logins, likes or staff edits for the rest of the day.
  analytics_writes: 40000,
};

/** Resources not listed here reset daily by default. */
export const QUOTA_PERIOD = {
  r2_class_a: 'month',
  r2_class_b: 'month',
};

const FLUSH_EVERY_MS = 10_000;
const FLUSH_EVERY_UNITS = 200;
const READ_CACHE_MS = 15_000;

function periodKey(resource) {
  const period = QUOTA_PERIOD[resource] || 'day';
  const now = new Date();
  if (period === 'month') return `usage:${resource}:${now.toISOString().slice(0, 7)}`;
  return `usage:${resource}:${now.toISOString().slice(0, 10)}`;
}

function expiresAt(resource) {
  const period = QUOTA_PERIOD[resource] || 'day';
  const ms = period === 'month' ? 32 * 86400000 : 26 * 3600000;
  return new Date(Date.now() + ms).toISOString().slice(0, 19).replace('T', ' ');
}

// Kept as an alias in case anything else imports the old name directly.
export const todayKey = periodKey;

/* ---- per-isolate state (module scope survives across requests) ---- */
const pending = new Map(); // key -> { amount, resource }
const cache = new Map(); // key -> { count, at }
let pendingUnits = 0;
let lastFlush = Date.now();
let flushing = null;
// When the counters table can't be read (migration 0009 not applied yet),
// stop trying for a minute instead of paying a failing query per request.
let disabledUntil = 0;

async function readCount(env, key) {
  if (Date.now() < disabledUntil) throw new Error('usage counters unavailable');
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < READ_CACHE_MS) return hit.count;
  let row;
  try {
    row = await env.DB.prepare('SELECT count FROM usage_counters WHERE key = ?').bind(key).first();
  } catch (err) {
    disabledUntil = Date.now() + 60_000;
    throw err;
  }
  const count = row ? Number(row.count) || 0 : 0;
  cache.set(key, { count, at: Date.now() });
  return count;
}

export async function flushUsage(env) {
  if (flushing) return flushing;
  if (!pending.size || !env || !env.DB) return;
  if (Date.now() < disabledUntil) {
    pending.clear();
    pendingUnits = 0;
    return;
  }
  const batch = Array.from(pending.entries());
  pending.clear();
  pendingUnits = 0;
  lastFlush = Date.now();
  flushing = (async () => {
    try {
      const stmts = batch.map(([key, { amount, resource }]) =>
        env.DB.prepare(
          `INSERT INTO usage_counters (key, count, expires_at) VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET count = count + excluded.count`
        ).bind(key, amount, expiresAt(resource))
      );
      // Opportunistic cleanup of old periods, roughly once per 50 flushes.
      if (Math.random() < 0.02) stmts.push(env.DB.prepare(`DELETE FROM usage_counters WHERE expires_at < datetime('now')`));
      await env.DB.batch(stmts);
      for (const [key, { amount }] of batch) {
        const hit = cache.get(key);
        if (hit) hit.count += amount;
      }
    } catch (err) {
      console.error('flushUsage failed, dropping this batch', err && err.message);
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

/** Check whether `resource` still has headroom. Does not consume anything;
 *  call addUsage() after the real operation completes with its actual cost. */
export async function checkQuota(env, resource) {
  const limit = QUOTA_LIMITS[resource];
  if (!limit) return { allowed: true, current: 0, limit: null };
  try {
    const key = periodKey(resource);
    const stored = await readCount(env, key);
    const current = stored + ((pending.get(key) || {}).amount || 0);
    return { allowed: current < limit - 1, current, limit };
  } catch (err) {
    return { allowed: true, current: 0, limit };
  }
}

/** Buffers the increment; flushes to D1 every few seconds or units. Never
 *  throws: recording usage must not fail the operation it measures. */
export async function addUsage(env, resource, amount) {
  const limit = QUOTA_LIMITS[resource];
  if (!limit || !amount) return;
  const key = periodKey(resource);
  const cur = pending.get(key);
  if (cur) cur.amount += amount;
  else pending.set(key, { amount, resource });
  pendingUnits += 1;
  if (pendingUnits >= FLUSH_EVERY_UNITS || Date.now() - lastFlush >= FLUSH_EVERY_MS) {
    await flushUsage(env);
  }
}

export async function getUsageSnapshot(env) {
  await flushUsage(env);
  const out = {};
  let tableMissing = false;
  for (const resource of Object.keys(QUOTA_LIMITS)) {
    const key = periodKey(resource);
    let current = 0;
    try {
      cache.delete(key);
      disabledUntil = 0;
      current = await readCount(env, key);
    } catch (err) {
      tableMissing = true;
    }
    out[resource] = { current, limit: QUOTA_LIMITS[resource] };
  }
  return { usage: out, tableMissing };
}

export class QuotaExceededError extends Error {
  constructor(resource) {
    super(`quota_exceeded:${resource}`);
    this.resource = resource;
  }
}
