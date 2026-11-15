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
        <div class="jg-skin" id="jg-skin">
          <canvas id="jg-3d" aria-label="Skin de ${esc(d.nombre)} en 3D"></canvas>
          <img class="jg-skin-plana" id="jg-plana" src="https://vzge.me/full/320/${esc(d.uuid)}" alt="Skin de ${esc(d.nombre)}" width="160" hidden>
          <div class="jg-poses" id="jg-poses" hidden>
            <button type="button" data-pose="quieto" class="on">Quieto</button>
            <button type="button" data-pose="andar">Andar</button>
            <button type="button" data-pose="correr">Correr</button>
            <button type="button" data-pose="volar">Volar</button>
          </div>
          <div class="jg-skin-pie" id="jg-skin-pie" hidden></div>
        </div>
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
      </div>
      ${htmlCapas(d.capas)}`;
    animarCapas();
    visor3d(d);
  }

  // ---------------------------------------------------------------- visor 3D
  // La skin real (la que se le vio en el servidor, o la de Mojang) con la capa que llevaba:
  // una capa DX se anima como en el juego (fotograma a fotograma desde su tira).
  let visor = null, relojCapa = null;
  function visor3d(d) {
    clearInterval(relojCapa);
    if (visor) { try { visor.dispose(); } catch { /* */ } visor = null; }
    const a = d.aspecto;
    const plana = $('jg-plana'), lienzo = $('jg-3d');
    if (!a || !a.skin || !window.skinview3d || !window.WebGLRenderingContext) {
      lienzo.hidden = true; plana.hidden = false;
      return;
    }
    const caja = $('jg-skin');
    const ancho = Math.min(300, caja.clientWidth - 24 || 260), alto = Math.round(ancho * 1.35);
    try {
      visor = new window.skinview3d.SkinViewer({ canvas: lienzo, width: ancho, height: alto, skin: `/api/textura/${a.skin}`, model: a.fina ? 'slim' : 'auto-detect' });
    } catch {
      lienzo.hidden = true; plana.hidden = false;
      return;
    }
    visor.zoom = 0.86;
    visor.fov = 40;
    visor.controls.enableZoom = false;
    visor.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    visor.autoRotateSpeed = 0.7;
    visor.playerWrapper.rotation.y = 0.5;
    const etiqueta = () => {
      if (!visor) return;
      visor.nameTag = new window.skinview3d.NameTagObject(d.nombre, {
        font: '600 44px Geist, system-ui, sans-serif', textStyle: '#ffffff', backgroundStyle: 'rgba(0,0,0,.32)', margin: [6, 18, 10, 18], height: 1.5,
      });
    };
    if (document.fonts && document.fonts.load) document.fonts.load('600 44px Geist').then(etiqueta, etiqueta); else etiqueta();
    lienzo.addEventListener('pointerdown', () => { visor.autoRotate = false; });
    const S = window.skinview3d;
    const poses = { quieto: () => new S.IdleAnimation(), andar: () => new S.WalkingAnimation(), correr: () => new S.RunningAnimation(), volar: () => new S.FlyingAnimation() };
    visor.animation = poses.quieto();
    const botones = [...document.querySelectorAll('#jg-poses button')];
    let espalda = 'cape';
    botones.forEach((b) => b.addEventListener('click', () => {
      botones.forEach((x) => x.classList.toggle('on', x === b));
      visor.animation = poses[b.dataset.pose]();
      espalda = b.dataset.pose === 'volar' ? 'elytra' : 'cape';
      if (capaActual) visor.loadCape(capaActual, { backEquipment: espalda });
    }));
    $('jg-poses').hidden = false;
    let capaActual = null;
    const pie = [];
    if (a.dx && CAPAS[a.dx]) {
      // capa DX animada: tira de texturas completas (256x128 por fotograma)
      const tira = new Image();
      const lienzoCapa = document.createElement('canvas');
      lienzoCapa.width = 256; lienzoCapa.height = 128;
      const cx = lienzoCapa.getContext('2d');
      cx.imageSmoothingEnabled = false;
      tira.onload = () => {
        const n = CAPAS[a.dx].fotogramas;
        const pintar = () => {
          const f = Math.floor(Date.now() / 100) % n;
          cx.clearRect(0, 0, 256, 128);
          cx.drawImage(tira, 0, f * 128, 256, 128, 0, 0, 256, 128);
          capaActual = lienzoCapa;
          visor.loadCape(lienzoCapa, { backEquipment: espalda });
        };
        pintar();
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches) relojCapa = setInterval(pintar, 100);
      };
      tira.src = `/assets/capas/${a.dx}-textura.webp`;
      pie.push(`Lleva la <b>${esc(CAPAS[a.dx].titulo)}</b>`);
    } else if (a.capa) {
      capaActual = `/api/textura/${a.capa}`;
      visor.loadCape(capaActual, { backEquipment: espalda });
      pie.push('Lleva su capa de Minecraft');
    }
    if (a.visto) pie.push(`visto ${esc(fecha(a.visto)).toLowerCase()}`);
    $('jg-skin-pie').innerHTML = pie.join(' · ') || 'Arrastra para girarlo';
    $('jg-skin-pie').hidden = false;
    // la skin, para quien la quiera
    const desc = document.createElement('a');
    desc.className = 'jg-descargar';
    desc.href = `/api/textura/${a.skin}`;
    desc.download = `${d.nombre}.png`;
    desc.textContent = 'Descargar skin';
    $('jg-skin-pie').append(document.createTextNode(' '), desc);
  }

  // Capas del launcher de Desafío Xtremo (las de Mojang no salen). Cada una es una tira
  // vertical de la cara delantera, un fotograma cada 100 ms, como en el juego.
  const CAPAS = {
    zdping: { titulo: 'Capa de zdping', etq: 'Única', fotogramas: 96 },
    gabo: { titulo: 'Capa de Gabo020', etq: 'Única', fotogramas: 64 },
    dev: { titulo: 'Capa del Equipo', etq: 'Exclusiva', fotogramas: 64 },
    dx: { titulo: 'Capa DX', etq: 'Para todos', fotogramas: 64 },
  };
  const ORDEN = ['zdping', 'gabo', 'dev', 'dx'];
  function htmlCapas(lista) {
    const capas = ORDEN.filter((id) => Array.isArray(lista) && lista.includes(id));
    if (!capas.length) return '';
    return `
      <div class="jg-capas">
        <p class="eyebrow">Capas</p>
        <ul>${capas.map((id) => `
          <li class="jg-capa ${id}">
            <span class="jg-capa-img" role="img" aria-label="${esc(CAPAS[id].titulo)}" data-n="${CAPAS[id].fotogramas}" style="background-image:url(/assets/capas/${id}.webp)"></span>
            <b>${esc(CAPAS[id].titulo)}</b>
            <small>${esc(CAPAS[id].etq)}</small>
          </li>`).join('')}
        </ul>
        <p class="jg-capas-nota">Se equipan desde el <a href="/launcher">launcher</a>.</p>
      </div>`;
  }
  let relojCapas = null;
  function animarCapas() {
    clearInterval(relojCapas);
    const els = [...document.querySelectorAll('.jg-capa-img')];
    if (!els.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    relojCapas = setInterval(() => {
      const t = Math.floor(Date.now() / 100);
      for (const el of els) {
        const n = Number(el.dataset.n);
        el.style.backgroundPosition = `0 ${((t % n) / (n - 1)) * 100}%`;
      }
    }, 100);
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
