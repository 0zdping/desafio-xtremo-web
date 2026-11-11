// GET /api/launcher/staff/jugador?nombre=X: ficha de un jugador para el staff (historial de
// sanciones, reportes recibidos, última conexión real, tiempo jugado). Sin caché: es privado.
import { withQuotaHandling, jsonResponse } from '../../../../backend/lib/http.js';
import { d1First, d1Select } from '../../../../backend/lib/db.js';
import { NOMBRE_MC } from '../../../../backend/lib/launcher.js';
import { conStaff } from '../../../../backend/lib/launcherStaff.js';

export const onRequestGet = withQuotaHandling(async ({ request, env }) => {
  const { error } = await conStaff(request, env, 'sanctions.access');
  if (error) return error;
  const nombre = new URL(request.url).searchParams.get('nombre') || '';
  if (!NOMBRE_MC.test(nombre)) return jsonResponse({ error: 'Escribe un nombre de Minecraft válido.' }, 400);
  const n = nombre.toLowerCase();
  const j = await d1First(
    env,
    `SELECT nombre, uuid, primera_vez, ultima_real, ultimo_servidor, minutos, clan_siglas, clan_nombre FROM jugadores WHERE nombre_lower = ?`,
    [n]
  );
  const vinculo = await d1First(
    env,
    `SELECT v.nombre, v.premium, v.created_at, u.username FROM mc_vinculos v JOIN users u ON u.id = v.user_id WHERE v.nombre_lower = ?`,
    [n]
  );
  const sanciones = await d1Select(
    env,
    `SELECT id, type, reason, staff_name, created_at, origen, servidor, expires_at, revocada_at, revocada_por
     FROM sanctions WHERE lower(target_nick) = ? ORDER BY created_at DESC LIMIT 50`,
    [n]
  );
  const reportes = await d1Select(
    env,
    `SELECT id, autor_nombre, motivo, detalle, estado, created_at FROM reportes WHERE lower(objetivo) = ? ORDER BY created_at DESC LIMIT 30`,
    [n]
  );
  if (!j && !vinculo && !sanciones.length && !reportes.length) return jsonResponse({ existe: false, nombre });
  return jsonResponse({
    existe: true,
    nombre: j ? j.nombre : vinculo ? vinculo.nombre : nombre,
    jugador: j ? {
      uuid: j.uuid, primeraVez: j.primera_vez, ultimaConexion: j.ultima_real, ultimoServidor: j.ultimo_servidor,
      minutos: j.minutos, clan: j.clan_siglas ? `${j.clan_nombre || ''} [${j.clan_siglas}]`.trim() : null,
    } : null,
    cuentaWeb: vinculo ? { discord: vinculo.username, premium: Boolean(vinculo.premium), desde: vinculo.created_at } : null,
    sanciones,
    reportes,
  });
});
