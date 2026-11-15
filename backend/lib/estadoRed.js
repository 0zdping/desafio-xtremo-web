// Foto pública del estado de la red (quién está jugando + ¿Desafío abierto?) como un JSON
// estático en el bucket público MEDIA: https://media.desafioxtremo.site/estado/red.json
//
// Por qué: cada launcher abierto pregunta por esto cada pocos minutos. Si lo pide a una Function
// (/api/launcher/online, /api/launcher/servidor) gasta del límite gratuito de 100.000 peticiones
// diarias de Pages Functions, aunque la respuesta salga de la caché del borde. Un archivo de R2
// servido por su dominio propio no pasa por ninguna Function: cuesta una lectura de R2 (clase B,
// 10 millones al mes gratis) y, con Cache-Control, casi siempre ni eso (lo sirve la caché).
//
// Se reescribe cuando el proxy publica la actividad (cada 5 minutos) y cuando cambia el estado del
// Desafío, así que un cambio hecho a mano en la tabla servidor_estado (acceso, previsto) llega como
// mucho en 5 minutos. Las rutas /api/launcher/online y /api/launcher/servidor siguen existiendo:
// las usan los launchers viejos y sirven de respaldo si este archivo falla.
import { checkQuota, addUsage } from './quota.js';
import { d1Select } from './db.js';

export const ESTADO_RED_KEY = 'estado/red.json';

/** Escribe estado/red.json. Nunca lanza: si falla, el launcher usa la API de respaldo. */
export async function publicarEstadoRed(env) {
  try {
    if (!env.MEDIA) return false;
    const gate = await checkQuota(env, 'r2_class_a');
    if (!gate.allowed) return false;
    const filas = await d1Select(env, `SELECT clave, valor, updated_at FROM servidor_estado WHERE clave IN ('online', 'desafio', 'acceso', 'previsto')`);
    const fila = (k) => filas.find((f) => f.clave === k);
    const online = fila('online');
    const fresco = online && Date.now() - Date.parse(`${online.updated_at.replace(' ', 'T')}Z`) < 12 * 60000;
    let servidores = {};
    if (fresco) {
      try { servidores = JSON.parse(online.valor) || {}; } catch { servidores = {}; }
    }
    const total = Object.values(servidores).reduce((n, l) => n + (Array.isArray(l) ? l.length : 0), 0);
    const d = fila('desafio');
    const cuerpo = {
      v: 1,
      generado: new Date().toISOString(),
      online: fresco ? { disponible: true, total, servidores, actualizado: online.updated_at } : { disponible: false, total: 0, servidores: {} },
      servidor: {
        desafio: d ? d.valor : 'desconocido', actualizado: d ? d.updated_at : null,
        acceso: (fila('acceso') || {}).valor === 'todos' ? 'todos' : 'staff',
        previsto: (fila('previsto') || {}).valor || '',
      },
    };
    await env.MEDIA.put(ESTADO_RED_KEY, JSON.stringify(cuerpo), {
      httpMetadata: { contentType: 'application/json; charset=utf-8', cacheControl: 'public, max-age=60' },
    });
    await addUsage(env, 'r2_class_a', 1);
    return true;
  } catch (err) {
    console.error('publicarEstadoRed', err && err.message);
    return false;
  }
}
