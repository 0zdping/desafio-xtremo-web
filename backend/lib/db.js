import { checkQuota, addUsage, QuotaExceededError } from './quota.js';

/** Run a SELECT. Blocks *before* querying if we're already within 1 row of
 *  today's free-tier read cap, and records the real rows_read afterward. */
export async function d1Select(env, sql, params = []) {
  const gate = await checkQuota(env, 'd1_reads');
  if (!gate.allowed) throw new QuotaExceededError('d1_reads');

  const result = await env.DB.prepare(sql).bind(...params).all();
  const rows = result.meta?.rows_read ?? result.results.length;
  await addUsage(env, 'd1_reads', rows || 1);
  return result.results;
}

export async function d1First(env, sql, params = []) {
  const rows = await d1Select(env, sql, params);
  return rows[0] ?? null;
}

/** Run an INSERT/UPDATE/DELETE. Same before/after quota pattern as above. */
export async function d1Run(env, sql, params = []) {
  const gate = await checkQuota(env, 'd1_writes');
  if (!gate.allowed) throw new QuotaExceededError('d1_writes');

  const result = await env.DB.prepare(sql).bind(...params).run();
  const rows = result.meta?.rows_written ?? 1;
  await addUsage(env, 'd1_writes', rows || 1);
  return result;
}
