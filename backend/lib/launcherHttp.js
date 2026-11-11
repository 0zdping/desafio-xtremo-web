// Utilidades compartidas por los endpoints del launcher (functions/api/launcher).
import { jsonResponse } from './http.js';
import { usuarioLauncher } from './launcher.js';

export async function conLauncher(request, env) {
  const u = await usuarioLauncher(request, env);
  if (!u) return { error: jsonResponse({ error: 'Sesión del launcher no válida. Vuelve a conectar tu cuenta.' }, 401) };
  return { u };
}

export async function leerJson(request, max = 2000) {
  const texto = await request.text();
  if (texto.length > max) return { texto, datos: null };
  try { return { texto, datos: JSON.parse(texto || '{}') }; } catch { return { texto, datos: null }; }
}

export const ahora = () => Math.floor(Date.now() / 1000);
