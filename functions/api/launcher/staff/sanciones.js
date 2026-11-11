// POST /api/launcher/staff/sanciones: SOLO dx-staff desde el proxy (firmado con DX_STAFF_PUBLICA).
// Copia a la web las sanciones puestas en el juego (nuevas y revocadas). Idempotente por id.
// No se guardan IPs: solo lo que el staff necesita ver en el panel.
import { withQuotaHandling, jsonResponse } from '../../../../backend/lib/http.js';
import { d1Run } from '../../../../backend/lib/db.js';
import { firmaServidorValida, NOMBRE_MC, UUID_MC } from '../../../../backend/lib/launcher.js';
import { leerJson } from '../../../../backend/lib/launcherHttp.js';

const TIPOS = { ban: 'ban', mute: 'mute', kick: 'kick', warn: 'warn' };
const fecha = (ms) => (ms > 0 ? new Date(ms).toISOString().replace('T', ' ').slice(0, 19) : null);
const txt = (v, max) => (typeof v === 'string' ? v.slice(0, max) : null);

export const onRequestPost = withQuotaHandling(async ({ request, env }) => {
  const { texto, datos } = await leerJson(request, 200000);
  if (!(await firmaServidorValida(request, env, texto, env.DX_STAFF_PUBLICA))) return jsonResponse({ error: 'Firma no válida.' }, 401);
  const lista = datos && Array.isArray(datos.sanciones) ? datos.sanciones.slice(0, 100) : null;
  if (!lista) return jsonResponse({ error: 'Datos no válidos.' }, 400);
  let guardadas = 0;
  for (const s of lista) {
    if (!Number.isInteger(s.id) || typeof s.objetivo !== 'string' || !NOMBRE_MC.test(s.objetivo)) continue;
    const uuid = typeof s.objetivoUuid === 'string' && UUID_MC.test(s.objetivoUuid) ? s.objetivoUuid.toLowerCase() : null;
    await d1Run(
      env,
      `INSERT INTO sanctions (target_nick, type, reason, staff_id, staff_name, created_at, origen, externo_id, target_uuid, servidor, plantilla, expires_at, revocada_at, revocada_por, revocada_motivo)
       VALUES (?, ?, ?, ?, ?, ?, 'juego', ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(origen, externo_id) DO UPDATE SET
         reason = excluded.reason, expires_at = excluded.expires_at, revocada_at = excluded.revocada_at,
         revocada_por = excluded.revocada_por, revocada_motivo = excluded.revocada_motivo`,
      [
        s.objetivo, TIPOS[String(s.tipo).toLowerCase()] || 'other', txt(s.motivo, 2000) || '',
        'juego:' + (txt(s.staffUuid, 36) || 'consola'), txt(s.staff, 32) || 'Consola', fecha(s.creada) || fecha(Date.now()),
        s.id, uuid, txt(s.servidor, 32), txt(s.plantilla, 48), fecha(s.expira),
        fecha(s.revocada), txt(s.revocadaPor, 32), txt(s.revocadaMotivo, 2000),
      ]
    );
    guardadas++;
  }
  return jsonResponse({ ok: true, guardadas });
});
