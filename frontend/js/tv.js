/* DX TV (/tv): el directo cuando lo hay y, si no, el cartel de fuera de emisión.
 *
 * Sin claves de API ni coste en Cloudflare: el vídeo lo sirve Twitch, y si el canal está en
 * directo o no lo dicen los propios eventos del reproductor de Twitch (ONLINE / OFFLINE). El
 * reproductor se queda cargado (oculto y silenciado) aunque no haya directo, para que, si empieza
 * con la página abierta, aparezca solo. */
(function () {
  'use strict';
  const CANAL = 'desafioxtremo';
  const raiz = document.querySelector('main.tv');
  if (!raiz) return;
  const $ = (id) => document.getElementById(id);
  const pildoraTxt = $('tv-pildora-txt');
  const reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let estado = 'comprobando';
  let player = null;

  /* ---------------------------------------------------------------- estado */
  function fijar(nuevo) {
    if (nuevo === estado) return;
    estado = nuevo;
    raiz.dataset.estado = nuevo;
    pildoraTxt.textContent = nuevo === 'directo' ? 'En directo' : nuevo === 'fuera' ? 'Fuera de emisión' : 'Comprobando';
    $('tv-retraso').hidden = nuevo !== 'directo';
    $('tv-fuera').setAttribute('aria-hidden', nuevo === 'directo' ? 'true' : 'false');
    document.title = nuevo === 'directo' ? '🔴 DX TV en directo · Desafio Xtremo' : 'DX TV · Desafio Xtremo';
    separador();
    if (nuevo === 'directo') { chat(true); sonido(); } else { chat(false); }
  }

  /* ---------------------------------------------------------------- chat de Twitch (solo en directo) */
  function chat(si) {
    const caja = $('tv-chat');
    if (!si) { caja.innerHTML = ''; return; }
    if (caja.querySelector('iframe')) return;
    const f = document.createElement('iframe');
    f.title = 'Chat de DX TV en Twitch';
    f.src = `https://www.twitch.tv/embed/${CANAL}/chat?parent=${encodeURIComponent(location.hostname)}&darkpopout`;
    f.loading = 'lazy';
    caja.appendChild(f);
  }

  /* ---------------------------------------------------------------- sonido: el navegador obliga a empezar sin él */
  const botonSonido = $('tv-sonido');
  function sonido() {
    try { botonSonido.classList.toggle('muestra', !!player && player.getMuted()); } catch { botonSonido.classList.add('muestra'); }
  }
  botonSonido.addEventListener('click', () => {
    if (!player) return;
    try { player.setMuted(false); if (player.getVolume() < 0.2) player.setVolume(0.6); } catch { /* */ }
    botonSonido.classList.remove('muestra');
  });

  /* ---------------------------------------------------------------- reproductor de Twitch */
  function cargarReproductor() {
    const s = document.createElement('script');
    s.src = 'https://player.twitch.tv/js/embed/v1.js';
    s.async = true;
    s.onload = () => {
      try {
        player = new window.Twitch.Player('tv-player', {
          channel: CANAL, parent: [location.hostname], width: '100%', height: '100%', muted: true, autoplay: true,
        });
        // El reproductor está siempre visible (tapado por el cartel): Twitch no arranca solo uno oculto.
        player.addEventListener(window.Twitch.Player.ONLINE, () => { fijar('directo'); try { player.play(); } catch { /* */ } });
        player.addEventListener(window.Twitch.Player.OFFLINE, () => fijar('fuera'));
        player.addEventListener(window.Twitch.Player.PLAYING, () => { fijar('directo'); sonido(); });
      } catch { fijar('fuera'); }
    };
    s.onerror = () => fijar('fuera'); // bloqueadores de contenido: se queda el cartel
    document.head.appendChild(s);
    // si Twitch no dice nada (red lenta, bloqueos), no dejar al visitante "comprobando" para siempre
    setTimeout(() => { if (estado === 'comprobando') fijar('fuera'); }, 9000);
  }

  /* ---------------------------------------------------------------- capturas pasando (fuera de emisión) */
  const fotos = [...document.querySelectorAll('.tv-fuera .tv-foto')];
  let actual = 0;
  if (fotos.length) {
    fotos[0].classList.add('on');
    if (!reducido) setInterval(() => {
      if (estado === 'directo' || document.hidden) return;
      fotos[actual].classList.remove('on');
      actual = (actual + 1) % fotos.length;
      fotos[actual].classList.add('on');
    }, 6500);
  }

  /* ---------------------------------------------------------------- jugadores en el Desafío ahora */
  function separador() { $('tv-sep').hidden = $('tv-retraso').hidden || $('tv-online').hidden; }
  async function online() {
    try {
      const r = await fetch('/api/launcher/online', { headers: { Accept: 'application/json' } });
      if (!r.ok) return;
      const d = await r.json();
      const el = $('tv-online');
      if (!d.disponible) { el.hidden = true; separador(); return; }
      const n = Number(d.total) || 0;
      el.innerHTML = '';
      const b = document.createElement('b');
      b.textContent = String(n);
      el.append(b, document.createTextNode(n === 1 ? ' jugador conectado ahora' : ' jugadores conectados ahora'));
      el.hidden = false;
      separador();
    } catch { /* sin dato, no se enseña */ }
  }

  cargarReproductor();
  online();
  setInterval(() => { if (!document.hidden) online(); }, 120000);
})();
