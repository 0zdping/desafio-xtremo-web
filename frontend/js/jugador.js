// Página pública de jugadores: /jugador (buscador + ranking) y /jugador/<nombre> (perfil).
(function () {
  'use strict';
  const NOMBRE = /^[A-Za-z0-9_]{3,16}$/;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const horas = (min) => {
    if (!min) return 'Menos de 5 min';
    const h = Math.floor(min / 60), m = min % 60;
    return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
  };
  const fecha = (sql) => {
    if (!sql) return 'Nunca';
    const d = new Date(`${sql.replace(' ', 'T')}Z`);
    const dias = Math.floor((Date.now() - d) / 86400000);
    if (dias <= 0) return 'Hoy';
    if (dias === 1) return 'Ayer';
    if (dias < 30) return `Hace ${dias} días`;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const SERVIDORES = { lobby: 'el lobby', 'desafio-xtremo': 'el Desafío' };

  function nombreDeRuta() {
    const m = /^\/jugador\/([A-Za-z0-9_]{3,16})\/?$/.exec(location.pathname);
    if (m) return m[1];
    const q = new URLSearchParams(location.search).get('n');
    return q && NOMBRE.test(q) ? q : null;
  }

  async function perfil(nombre) {
    const r = $('jg-resultado');
    r.innerHTML = '<p class="jg-vacio">Buscando…</p>';
    let d;
    try {
      const res = await fetch(`/api/jugador/${encodeURIComponent(nombre)}`);
      d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Error');
    } catch (e) {
      r.innerHTML = `<p class="jg-vacio">No se ha podido cargar el perfil. ${esc(e.message)}</p>`;
      return;
    }
    if (!d.existe) {
      r.innerHTML = `<p class="jg-vacio"><b>${esc(nombre)}</b> todavía no ha jugado en Desafío Xtremo.</p>`;
      return;
    }
    document.title = `${d.nombre} · Desafio Xtremo`;
    $('jg-titulo').textContent = d.nombre;
    $('jg-intro').hidden = true;
    const estado = d.conectado
      ? `<p class="jg-estado">● Jugando ahora en ${esc(SERVIDORES[d.conectado] || d.conectado)}</p>`
      : `<p class="jg-estado off">Desconectado</p>`;
    r.innerHTML = `
      <div class="jg-ficha">
        <div class="jg-skin"><img src="https://vzge.me/full/320/${esc(d.uuid)}" alt="Skin de ${esc(d.nombre)}" width="160"></div>
        <div>
          <p class="jg-nombre">${esc(d.nombre)}</p>
          ${estado}
          <ul class="jg-datos">
            <li><small>Tiempo jugado</small><b>${esc(horas(d.minutos))}</b></li>
            <li><small>Puesto en el ranking</small><b>${d.puesto ? `#${d.puesto}` : 'Sin puesto'}</b></li>
            <li><small>Clan</small><b>${d.clan ? `${esc(d.clan.nombre || '')} [${esc(d.clan.siglas)}]` : 'Sin clan'}</b></li>
            <li><small>Última vez</small><b>${d.conectado ? 'Ahora mismo' : esc(fecha(d.ultimaVez))}</b></li>
            <li><small>Primera vez</small><b>${esc(fecha(d.primeraVez))}</b></li>
          </ul>
        </div>
      </div>`;
  }

  async function ranking() {
    const ol = $('jg-ranking');
    try {
      const d = await (await fetch('/api/launcher/ranking')).json();
      if (!d.jugadores || !d.jugadores.length) {
        ol.innerHTML = '<li class="jg-vacio">El ranking empieza cuando se abran las puertas del Desafío.</li>';
        return;
      }
      ol.innerHTML = d.jugadores.map((j, i) => `
        <li><a href="/jugador/${encodeURIComponent(j.nombre)}">
          <span class="p">#${i + 1}</span>
          <img src="https://vzge.me/face/64/${encodeURIComponent(j.nombre)}" alt="" loading="lazy" width="32" height="32">
          <span>${esc(j.nombre)}${j.clan ? ` <small>[${esc(j.clan)}]</small>` : ''}</span>
          <span class="t">${esc(horas(j.minutos))}</span>
        </a></li>`).join('');
    } catch {
      ol.innerHTML = '<li class="jg-vacio">No se ha podido cargar el ranking.</li>';
    }
  }

  $('jg-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const n = $('jg-nombre').value.trim();
    if (!NOMBRE.test(n)) return;
    history.pushState(null, '', `/jugador/${n}`);
    perfil(n);
  });
  window.addEventListener('popstate', () => { const n = nombreDeRuta(); if (n) perfil(n); });

  const inicial = nombreDeRuta();
  if (inicial) { $('jg-nombre').value = inicial; perfil(inicial); }
  ranking();
})();
