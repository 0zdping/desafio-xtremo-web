// Cosméticos del launcher que salen en los airdrops (DXAirdrops). El tipo va en el prefijo del id.
// Tienen que existir en el mod del launcher (dx-launcher/mod, cosmeticos/Cosmeticos.java y capas/Capas.java).
export const COSMETICOS = {
  gorro_casco: 'Casco militar',
  gorro_aviador: 'Gorro de aviador',
  gorro_corona: 'Corona DX',
  capa_camuflaje: 'Capa de camuflaje',
  capa_paracaidas: 'Capa paracaídas',
  estandarte_airdrop: 'Estandarte del airdrop',
  alas_chatarra: 'Alas de chatarra',
  alas_aurora: 'Alas de aurora',
};

export const esCapa = (id) => id.startsWith('capa_');

/** { cosmetico: [nombres] } de todos los jugadores. */
export async function duenos(env, d1Select) {
  const filas = await d1Select(env, `SELECT DISTINCT cosmetico, nombre FROM launcher_cosmeticos ORDER BY cosmetico, nombre`);
  const m = {};
  for (const f of filas) if (COSMETICOS[f.cosmetico]) (m[f.cosmetico] = m[f.cosmetico] || []).push(f.nombre);
  return m;
}

/** Cosméticos de un jugador (ids). */
export async function cosmeticosDe(env, nombre, d1Select) {
  const filas = await d1Select(env, `SELECT DISTINCT cosmetico FROM launcher_cosmeticos WHERE nombre = ? ORDER BY cosmetico`, [nombre]);
  return filas.map((f) => f.cosmetico).filter((c) => COSMETICOS[c]);
}
