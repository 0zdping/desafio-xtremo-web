import {
  requirePermissionAndCsrf,
  jsonResponse,
  withQuotaHandling,
} from '../../../../backend/lib/adminGuard.js';
import { d1Run, d1First } from '../../../../backend/lib/db.js';

const NICK_RE = /^[A-Za-z0-9_]+$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const TEAMS = ['staff', 'dev'];

function validateMember(body) {
  const mc_nick = (body?.mc_nick || '').trim();
  const rank_label = (body?.rank_label || '').trim();
  const rank_color = (body?.rank_color || '').trim();
  const function_text = (body?.function_text || '').trim();
  const team = (body?.team || '').trim();
  const position = Number.isFinite(body?.position) ? Math.trunc(body.position) : 0;

  if (!mc_nick || mc_nick.length > 16 || !NICK_RE.test(mc_nick)) {
    return { error: 'Nick de Minecraft inválido.' };
  }
  if (!rank_label || rank_label.length > 40) return { error: 'Rango inválido.' };
  if (!COLOR_RE.test(rank_color)) return { error: 'Color inválido (usa formato #RRGGBB).' };
  if (function_text.length > 140) return { error: 'Función inválida.' };
  if (!TEAMS.includes(team)) return { error: 'Equipo inválido.' };

  return { value: { mc_nick, rank_label, rank_color, function_text, team, position } };
}

export const onRequestPatch = withQuotaHandling(async (context) => {
  const { request, env, params } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'team.manage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const memberId = Number(params.id);
  if (!Number.isInteger(memberId)) return jsonResponse({ error: 'Miembro inválido.' }, 400);

  const existing = await d1First(env, `SELECT id FROM team_members WHERE id = ?`, [memberId]);
  if (!existing) return jsonResponse({ error: 'Miembro no encontrado.' }, 404);

  const body = await request.json().catch(() => null);
  const parsed = validateMember(body);
  if (parsed.error) return jsonResponse({ error: parsed.error }, 400);
  const { mc_nick, rank_label, rank_color, function_text, team, position } = parsed.value;

  await d1Run(
    env,
    `UPDATE team_members SET mc_nick = ?, rank_label = ?, rank_color = ?, function_text = ?, team = ?, position = ? WHERE id = ?`,
    [mc_nick, rank_label, rank_color, function_text, team, position, memberId]
  );

  const member = await d1First(env, `SELECT * FROM team_members WHERE id = ?`, [memberId]);
  return jsonResponse({ member });
});

export const onRequestDelete = withQuotaHandling(async (context) => {
  const { request, env, params } = context;
  const guard = await requirePermissionAndCsrf(request, env, 'team.manage');
  if (!guard.ok) return jsonResponse(guard.body, guard.status);

  const memberId = Number(params.id);
  if (!Number.isInteger(memberId)) return jsonResponse({ error: 'Miembro inválido.' }, 400);

  const existing = await d1First(env, `SELECT id FROM team_members WHERE id = ?`, [memberId]);
  if (!existing) return jsonResponse({ error: 'Miembro no encontrado.' }, 404);

  await d1Run(env, `DELETE FROM team_members WHERE id = ?`, [memberId]);
  return jsonResponse({ ok: true });
});
