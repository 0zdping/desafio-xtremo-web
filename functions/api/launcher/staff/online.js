// POST /api/launcher/staff/online: SOLO dx-staff desde el proxy (firmado). Reemplaza la lista
// del staff conectado ahora mismo, para la sección de staff del launcher.
import { withQuotaHandling, jsonResponse } from '../../../../backend/lib/http.js';
import { d1Run } from '../../../../backend/lib/db.js';
import { firmaServidorValida, NOMBRE_MC, UUID_MC } from '../../../../backend/lib/launcher.js';
import { leerJson } from '../../../../backend/lib/launcherHttp.js';

export const onRequestPost = withQuotaHandling(async ({ request, env }) => {
  const { texto, datos } = await leerJson(request, 20000);
  if (!(await firmaServidorValida(request, env, texto, env.DX_STAFF_PUBLICA))) return jsonResponse({ error: 'Firma no válida.' }, 401);
  const lista = datos && Array.isArray(datos.staff) ? datos.staff.slice(0, 60) : null;
  if (!lista) return jsonResponse({ error: 'Datos no válidos.' }, 400);
  await d1Run(env, `DELETE FROM staff_online`);
  for (const s of lista) {
    if (typeof s.uuid !== 'string' || !UUID_MC.test(s.uuid) || typeof s.nombre !== 'string' || !NOMBRE_MC.test(s.nombre)) continue;
    await d1Run(
      env,
      `INSERT OR REPLACE INTO staff_online (uuid, nombre, servidor, desde, vanish, modo_staff) VALUES (?, ?, ?, ?, ?, ?)`,
      [s.uuid.toLowerCase(), s.nombre, typeof s.servidor === 'string' ? s.servidor.slice(0, 32) : null,
        Number.isFinite(s.desde) ? s.desde : null, s.vanish ? 1 : 0, s.modoStaff ? 1 : 0]
    );
  }
  return jsonResponse({ ok: true });
});
