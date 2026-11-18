/** Postulaciones a Staff / Desarrollo: validación compartida por la API pública y el panel. */
export const ESTADOS = ['pendiente', 'en_revision', 'aceptada', 'rechazada'];
export const MAX_RESPUESTA = { corto: 200, largo: 2000 };
const MAX_PREGUNTAS = 15;
const MAX_TEXTO_PREGUNTA = 300;

export function leerPreguntas(json) {
  try {
    const v = JSON.parse(json || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Valida la lista de preguntas que manda el panel. Devuelve { value } o { error }. */
export function validarPreguntas(lista) {
  if (!Array.isArray(lista) || !lista.length) return { error: 'Hace falta al menos una pregunta.' };
  if (lista.length > MAX_PREGUNTAS) return { error: `Como mucho ${MAX_PREGUNTAS} preguntas.` };
  const ids = new Set();
  const out = [];
  for (const [i, p] of lista.entries()) {
    if (!p || typeof p !== 'object') return { error: `Pregunta ${i + 1} no válida.` };
    const texto = String(p.texto || '').trim();
    if (!texto || texto.length > MAX_TEXTO_PREGUNTA) return { error: `La pregunta ${i + 1} está vacía o es demasiado larga.` };
    const tipo = p.tipo === 'corto' ? 'corto' : 'largo';
    let id = String(p.id || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) || `p${i + 1}`;
    while (ids.has(id)) id += '-2';
    ids.add(id);
    out.push({ id, texto, tipo, obligatoria: p.obligatoria !== false });
  }
  return { value: out };
}

/** Comprueba las respuestas contra las preguntas del puesto. Devuelve { value: [{texto, respuesta}] } o { error }. */
export function validarRespuestas(preguntas, respuestas) {
  if (!respuestas || typeof respuestas !== 'object' || Array.isArray(respuestas)) return { error: 'Respuestas no válidas.' };
  const out = [];
  for (const p of preguntas) {
    const bruto = respuestas[p.id];
    if (bruto !== undefined && bruto !== null && typeof bruto !== 'string') return { error: 'Respuestas no válidas.' };
    const r = String(bruto || '').trim();
    if (p.obligatoria && !r) return { error: `Falta responder: «${p.texto}»` };
    const max = MAX_RESPUESTA[p.tipo] || MAX_RESPUESTA.largo;
    if (r.length > max) return { error: `La respuesta a «${p.texto}» es demasiado larga (máx. ${max}).` };
    out.push({ texto: p.texto, respuesta: r });
  }
  return { value: out };
}

/** Aviso opcional al Discord del equipo (secreto POSTULACIONES_WEBHOOK). Nunca rompe la petición. */
export async function avisarDiscord(env, contenido) {
  const url = env.POSTULACIONES_WEBHOOK;
  if (!url || !/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(url)) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: contenido.slice(0, 1900), allowed_mentions: { parse: [] } }),
    });
  } catch {
    /* el aviso es opcional */
  }
}
