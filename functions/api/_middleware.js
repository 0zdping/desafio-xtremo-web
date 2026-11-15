// Cuenta cada petición a /api/* para el monitor de cuotas del panel: el plan gratuito de Pages
// Functions da 100.000 al día y es el límite que antes llega con muchos launchers abiertos.
// Solo cuenta (no corta nada) y en diferido: el contador va en memoria y se vuelca a D1 en lote.
// Va en functions/api/ y no en la raíz a propósito: un _middleware en la raíz haría pasar también
// los archivos estáticos por Functions, y cada imagen o CSS gastaría del límite.
import { addUsage } from '../../backend/lib/quota.js';

export async function onRequest(context) {
  try {
    context.waitUntil(addUsage(context.env, 'fn_requests', 1));
  } catch {
    // contar nunca debe romper la petición
  }
  return context.next();
}
