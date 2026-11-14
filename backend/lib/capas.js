// Capas propias del launcher de Desafío Xtremo (las de Mojang no cuentan aquí).
// Las personales van atadas a un nombre, igual que en el launcher y en DX Models.
export const CAPAS_PERSONALES = { zdping: 'zdping', gabo: 'gabo020' };

// Capas de un jugador: la DX (todas las cuentas), las personales y las dadas en el panel.
export async function capasDe(env, nombre, d1Select) {
  const n = String(nombre).toLowerCase();
  const capas = ['dx'];
  for (const [capa, dueno] of Object.entries(CAPAS_PERSONALES)) if (dueno === n) capas.push(capa);
  const filas = await d1Select(env, `SELECT capa FROM launcher_capas WHERE nombre = ? ORDER BY created_at`, [nombre]);
  for (const f of filas) if (!capas.includes(f.capa) && !CAPAS_PERSONALES[f.capa]) capas.push(f.capa);
  return capas;
}
