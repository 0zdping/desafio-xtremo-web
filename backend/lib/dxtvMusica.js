/** Canciones de DX Música para la realización de DX TV (mismas que en el servidor: repo dx-musica,
 *  canciones.yml). El audio vive en el bucket PRIVADO de R2 (EVIDENCE, dxtv/musica/<id>.ogg) y solo
 *  lo descargan los owners con el launcher: nunca se sirve en público. */
export const MUSICA = [
  { id: 'frost_waltz', titulo: 'Frost Waltz', artista: 'Kevin MacLeod', ambiente: 'calma' },
  { id: 'floating_cities', titulo: 'Floating Cities', artista: 'Kevin MacLeod', ambiente: 'calma' },
  { id: 'frozen_star', titulo: 'Frozen Star', artista: 'Kevin MacLeod', ambiente: 'calma' },
  { id: 'dreamer', titulo: 'Dreamer', artista: 'Kevin MacLeod', ambiente: 'calma' },
  { id: 'healing', titulo: 'Healing', artista: 'Kevin MacLeod', ambiente: 'calma' },
  { id: 'wallpaper', titulo: 'Wallpaper', artista: 'Kevin MacLeod', ambiente: 'calma' },
  { id: 'easy_lemon', titulo: 'Easy Lemon', artista: 'Kevin MacLeod', ambiente: 'calma' },
  { id: 'lobby_time', titulo: 'Lobby Time', artista: 'Kevin MacLeod', ambiente: 'calma' },
  { id: 'duki_antes_de_perderte', titulo: 'Antes de Perderte', artista: 'Duki', ambiente: 'calma', copyright: true },
  { id: 'five_armies', titulo: 'Five Armies', artista: 'Kevin MacLeod', ambiente: 'accion' },
  { id: 'clash_defiant', titulo: 'Clash Defiant', artista: 'Kevin MacLeod', ambiente: 'accion' },
  { id: 'crossing_the_chasm', titulo: 'Crossing the Chasm', artista: 'Kevin MacLeod', ambiente: 'accion' },
  { id: 'volatile_reaction', titulo: 'Volatile Reaction', artista: 'Kevin MacLeod', ambiente: 'accion' },
  { id: 'intended_force', titulo: 'Intended Force', artista: 'Kevin MacLeod', ambiente: 'accion' },
  { id: 'gathering_darkness', titulo: 'Gathering Darkness', artista: 'Kevin MacLeod', ambiente: 'accion' },
  { id: 'darkest_child', titulo: 'Darkest Child', artista: 'Kevin MacLeod', ambiente: 'accion' },
  { id: 'heroic_age', titulo: 'Heroic Age', artista: 'Kevin MacLeod', ambiente: 'accion' },
  { id: 'duki_goteo', titulo: 'Goteo', artista: 'Duki', ambiente: 'accion', copyright: true },
].map((c) => ({ ...c, credito: c.artista === 'Kevin MacLeod' ? 'Kevin MacLeod (incompetech.com) · CC BY 4.0' : '' }));
