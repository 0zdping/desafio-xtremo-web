// POST /api/launcher/informe: el launcher manda los registros cuando el juego se cierra con un error.
// Sin sesión (cualquiera puede tener un fallo), limitado por IP y por tamaño. El texto va al bucket
// privado EVIDENCE: solo el staff lo puede leer (GET /api/launcher/staff/informes).
import { withQuotaHandling, jsonResponse } from '../../../backend/lib/http.js';
import { rateLimit, clientIp } from '../../../backend/lib/rateLimit.js';
import { d1Run } from '../../../backend/lib/db.js';
import { checkQuota, addUsage, QuotaExceededError } from '../../../backend/lib/quota.js';
import { NOMBRE_MC } from '../../../backend/lib/launcher.js';

const MAX = 1.5 * 1024 * 1024;

export const onRequestPost = withQuotaHandling(async ({ request, env }) => {
  const { allowed } = await rateLimit(env, `launcher-informe:${clientIp(request)}`, 3, 3600);
  if (!allowed) return jsonResponse({ error: 'Ya has mandado varios informes. Prueba más tarde.' }, 429);
  if (!env.EVIDENCE) return jsonResponse({ error: 'No disponible.' }, 503);
  const texto = await request.text();
  if (texto.length > MAX) return jsonResponse({ error: 'Informe demasiado grande.' }, 413);
  let d;
  try { d = JSON.parse(texto); } catch { return jsonResponse({ error: 'Informe no válido.' }, 400); }
  if (typeof d.registro !== 'string' || !d.registro.length) return jsonResponse({ error: 'Informe vacío.' }, 400);
  const nombre = typeof d.nombre === 'string' && NOMBRE_MC.test(d.nombre) ? d.nombre : null;
  const version = typeof d.version === 'string' ? d.version.slice(0, 16) : null;
  const sistema = typeof d.sistema === 'string' ? d.sistema.slice(0, 80) : null;
  // Resumen: la primera línea de error que aparezca, para verlo de un vistazo.
  const linea = d.registro.split('\n').find((l) => /Exception|ERROR|FATAL|Crash/i.test(l)) || '';
  const gate = await checkQuota(env, 'r2_class_a');
  if (!gate.allowed) throw new QuotaExceededError('r2_class_a');
  const key = `informes/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.txt`;
  await env.EVIDENCE.put(key, d.registro, { httpMetadata: { contentType: 'text/plain; charset=utf-8' } });
  await addUsage(env, 'r2_class_a', 1);
  await d1Run(env, `INSERT INTO informes_fallo (nombre, version_launcher, sistema, resumen, r2_key, tamano) VALUES (?, ?, ?, ?, ?, ?)`,
    [nombre, version, sistema, linea.slice(0, 300), key, d.registro.length]);
  return jsonResponse({ ok: true });
});
