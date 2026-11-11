/** Launcher de Desafío Xtremo: sesiones, billetes y firma servidor -> web.
 *  Diseño completo en el repo dx-launcher, docs/SEGURIDAD.md.
 *
 *  Secretos (variables de Cloudflare Pages, tipo "secret"):
 *   - DX_BILLETE_CLAVE: clave privada Ed25519 (PKCS8 en base64) que firma los billetes.
 *     El proxy solo tiene la pública: no puede fabricar billetes.
 *   - DX_SERVIDOR_PUBLICA: clave pública Ed25519 del proxy (SPKI en base64) para /vincular.
 *     La privada la genera el proxy y no sale del portátil.
 */
import { d1First, d1Run } from './db.js';

const enc = new TextEncoder();
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I

export const NOMBRE_MC = /^[A-Za-z0-9_]{3,16}$/;
export const UUID_MC = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
export const BILLETE_SEGUNDOS = 60;

export function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function aleatorio(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}

export function codigoLegible(n = 8) {
  const r = aleatorio(n);
  let s = '';
  for (const b of r) s += ALFABETO[b % ALFABETO.length];
  return s;
}

export async function sha256Hex(texto) {
  const h = await crypto.subtle.digest('SHA-256', enc.encode(texto));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Usuario dueño del token "Authorization: Bearer ..." del launcher, o null. */
export async function usuarioLauncher(request, env) {
  const m = /^Bearer ([A-Za-z0-9_-]{40,100})$/.exec(request.headers.get('authorization') || '');
  if (!m) return null;
  const hash = await sha256Hex(m[1]);
  const fila = await d1First(
    env,
    `SELECT s.user_id AS id, u.username, u.avatar FROM launcher_sesiones s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`,
    [hash]
  );
  if (!fila) return null;
  return { ...fila, tokenHash: hash };
}

/** Staff o equipo = cualquier rango asignado en la web. Para un jugador, ninguno. */
export async function esStaff(env, userId) {
  const fila = await d1First(env, `SELECT 1 AS si FROM user_roles WHERE user_id = ? LIMIT 1`, [userId]);
  return Boolean(fila);
}

/** Petición firmada por el proxy: X-DX-Fecha (segundos) y X-DX-Firma = Ed25519(fecha + "\n" + cuerpo) en base64. */
export async function firmaServidorValida(request, env, cuerpo, clave = env.DX_SERVIDOR_PUBLICA) {
  // Clave pública Ed25519 del plugin que firma (SPKI en base64): DX Login (DX_SERVIDOR_PUBLICA)
  // o dx-staff (DX_STAFF_PUBLICA). Las privadas solo existen en el portátil.
  const publica = clave;
  if (!publica) return false;
  const fecha = request.headers.get('x-dx-fecha') || '';
  const t = Number(fecha);
  if (!Number.isInteger(t) || Math.abs(Date.now() / 1000 - t) > 60) return false;
  try {
    const der = Uint8Array.from(atob(publica), (c) => c.charCodeAt(0));
    const firma = Uint8Array.from(atob(request.headers.get('x-dx-firma') || ''), (c) => c.charCodeAt(0));
    const k = await crypto.subtle.importKey('spki', der, { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'Ed25519' }, k, firma, enc.encode(`${fecha}\n${cuerpo}`));
  } catch {
    return false;
  }
}

function uuidBytes(uuid) {
  const hex = uuid.replace(/-/g, '');
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/**
 * Billete: base64url de [versión 1][caduca u32 BE][nonce 8][uuid 16][largo nombre 1][nombre][firma Ed25519 64].
 * Cabe de sobra en el handshake de Minecraft (unos 140 caracteres).
 */
export async function firmarBillete(env, { nombre, uuid }) {
  const der = Uint8Array.from(atob(env.DX_BILLETE_CLAVE || ''), (c) => c.charCodeAt(0));
  const clave = await crypto.subtle.importKey('pkcs8', der, { name: 'Ed25519' }, false, ['sign']);
  const n = enc.encode(nombre);
  const datos = new Uint8Array(1 + 4 + 8 + 16 + 1 + n.length);
  const caduca = Math.floor(Date.now() / 1000) + BILLETE_SEGUNDOS;
  datos[0] = 1;
  new DataView(datos.buffer).setUint32(1, caduca);
  datos.set(aleatorio(8), 5);
  datos.set(uuidBytes(uuid), 13);
  datos[29] = n.length;
  datos.set(n, 30);
  const firma = new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, clave, datos));
  const todo = new Uint8Array(datos.length + firma.length);
  todo.set(datos);
  todo.set(firma, datos.length);
  return { billete: b64url(todo), caduca };
}

export async function tocarSesion(env, tokenHash) {
  await d1Run(env, `UPDATE launcher_sesiones SET last_used = datetime('now') WHERE token_hash = ?`, [tokenHash]);
}
