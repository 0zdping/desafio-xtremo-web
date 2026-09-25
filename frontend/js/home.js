/* ==========================================================================
   home.js · wiring for the home narrative. Depends on site.js (DX),
   motion.js (DXMotion), island.js (DXIsland), pixel-icons.js (DXPixel),
   posts.js (DXPosts).
   ========================================================================== */
(function () {
  const DX = window.DX;
  const M = window.DXMotion;
  const clamp = M.clamp;
  const SEED = 20260925;
  const vw = () => window.innerWidth;
  const vh = () => window.innerHeight;

  /* ---------------- hero island + markers + HUD ---------------- */
  const hero = document.getElementById('inicio');
  const heroCanvas = document.getElementById('island-hero');
  if (hero && heroCanvas) {
    const island = DXIsland.create(heroCanvas, { seed: SEED });
    const rng = DXIsland.rng(7);
    const markers = document.getElementById('hero-markers');
    const me = island.randomLand('forest', rng);
    const mates = [island.randomLand('snow', rng), island.randomLand('desert', rng), island.randomLand('forest', rng)];
    const mk = (pos, cls, label) =>
      `<div class="mk ${cls}" style="left:${(pos.x * 100).toFixed(2)}%;top:${(pos.y * 100).toFixed(2)}%"><span class="mk-label">${label}</span><span class="mk-pin"></span></div>`;
    markers.innerHTML = mates.map((p) => mk(p, 'mate', '?')).join('') + mk(me, 'me', 'Tú');

    const hx = document.getElementById('hud-x');
    const hz = document.getElementById('hud-z');
    const hb = document.getElementById('hud-biome');
    const baseX = Math.round((me.x - 0.5) * 3000);
    const baseZ = Math.round((me.y - 0.5) * 2000);
    M.onScene(hero, (p) => {
      if (hx) hx.textContent = 'X ' + (baseX + Math.round(p * 214));
      if (hz) hz.textContent = 'Z ' + (baseZ - Math.round(p * 96));
      if (hb) hb.textContent = p > 0.25 ? 'Bioma · Bosque' : 'Bioma · desconocido';
    });
  }

  /* ---------------- ticker (speed reacts to scroll velocity) ---------------- */
  (function () {
    const rows = Array.from(document.querySelectorAll('.ticker-row'));
    if (!rows.length) return;
    const tracks = rows.map((row) => {
      const track = row.querySelector('.ticker-track');
      const html = track.innerHTML;
      track.innerHTML = html + html + html; // enough copies to loop seamlessly
      return { track, dir: Number(row.dataset.dir) || 1, x: 0, width: 0 };
    });
    const measure = () => tracks.forEach((t) => (t.width = t.track.scrollWidth / 3));
    measure();
    window.addEventListener('resize', measure);
    // The display font is much wider than its fallback: re-measure once the
    // web fonts land, or the loop point is wrong and the text jumps.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    if (M.reduced) return;
    let boost = 0;
    let lastY = window.scrollY;
    M.onScroll(({ y }) => {
      boost = Math.min(18, boost + Math.abs(y - lastY) * 0.06);
      lastY = y;
    });
    let last = performance.now();
    let raf = null;
    function loop(t) {
      const dt = Math.min(50, t - last);
      last = t;
      boost *= 0.92;
      tracks.forEach((tr) => {
        if (!tr.width) return;
        tr.x -= tr.dir * (0.045 + boost * 0.02) * dt;
        if (tr.x <= -tr.width) tr.x += tr.width;
        if (tr.x > 0) tr.x -= tr.width;
        tr.track.style.transform = `translate3d(${tr.x.toFixed(2)}px,0,0)`;
      });
      raf = requestAnimationFrame(loop);
    }
    const start = () => {
      if (raf == null) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    const stop = () => {
      if (raf != null) cancelAnimationFrame(raf);
      raf = null;
    };
    // Only animate while the ticker is on screen and the tab is visible.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => (e[0].isIntersecting && !document.hidden ? start() : stop())).observe(document.querySelector('.ticker'));
    } else start();
    document.addEventListener('visibilitychange', () => document.hidden && stop());
  })();

  /* ---------------- 01 resource nodes (click to harvest) ---------------- */
  (function () {
    const yields = { wood: [1, 3], stone: [1, 2], metal: [1, 1], cloth: [5, 5] };
    const colors = { wood: '#c7924f', stone: '#9aa7a4', metal: '#dde6ef', cloth: '#6ae6c5' };
    let total = 0;
    document.querySelectorAll('.node-card').forEach((card) => {
      const type = card.dataset.node;
      const countEl = card.querySelector('.node-count span');
      let count = 0;
      card.addEventListener('click', (e) => {
        const [lo, hi] = yields[type] || [1, 1];
        const gain = lo + Math.floor(Math.random() * (hi - lo + 1));
        count += gain;
        total += gain;
        countEl.textContent = count;
        card.classList.remove('hit');
        void card.offsetWidth;
        card.classList.add('hit');
        if (M.reduced) return;
        const r = card.getBoundingClientRect();
        const icon = card.querySelector('.node-icon').getBoundingClientRect();
        const ox = (e.clientX || icon.left + icon.width / 2) - r.left;
        const oy = (e.clientY || icon.top + icon.height / 2) - r.top;
        const pop = document.createElement('span');
        pop.className = 'node-pop';
        pop.textContent = '+' + gain;
        pop.style.left = ox + 'px';
        pop.style.top = oy - 20 + 'px';
        card.appendChild(pop);
        setTimeout(() => pop.remove(), 950);
        for (let i = 0; i < 7; i++) {
          const chip = document.createElement('span');
          chip.className = 'node-chip';
          chip.style.left = ox + 'px';
          chip.style.top = oy + 'px';
          chip.style.background = colors[type];
          chip.style.setProperty('--cx', (Math.random() * 90 - 45).toFixed(0) + 'px');
          chip.style.setProperty('--cy', (Math.random() * 70 - 50).toFixed(0) + 'px');
          card.appendChild(chip);
          setTimeout(() => chip.remove(), 720);
        }
        if (total >= 25) achievement('Recolector nato', 'pickaxe');
      });
    });
  })();

  /* ---------------- 02 crafting (pinned steps) ---------------- */
  (function () {
    const sec = document.getElementById('fabricacion');
    if (!sec) return;
    const steps = sec.querySelectorAll('.craft-step');
    const dots = sec.querySelectorAll('.craft-dots span');
    const items = sec.querySelectorAll('.inv-item');
    const tiers = sec.querySelectorAll('.tier');
    const levelEl = document.getElementById('craft-level');
    const panel = sec.querySelector('.inv-panel');
    let current = -1;
    M.onScene(sec, (p) => {
      const f = clamp(p * 1.08) * 4;
      const step = Math.min(3, Math.floor(f));
      panel.style.setProperty('--craft', (f - step).toFixed(3));
      if (step === current) return;
      current = step;
      steps.forEach((s, i) => {
        s.classList.toggle('is-active', i === step);
        s.classList.toggle('is-past', i < step);
      });
      dots.forEach((d, i) => d.classList.toggle('on', i <= step));
      items.forEach((it) => {
        const tier = Number(it.dataset.tier);
        const on = tier <= step;
        it.classList.toggle('new', on && tier === step && step > 0);
        it.classList.toggle('on', on);
      });
      tiers.forEach((t, i) => t.classList.toggle('on', i < step));
      if (levelEl) levelEl.textContent = step;
    });
  })();

  /* ---------------- 03 biomes (pinned map fly-over) ---------------- */
  (function () {
    const sec = document.getElementById('biomas');
    const canvas = document.getElementById('island-biomes');
    if (!sec || !canvas) return;
    const island = DXIsland.create(canvas, { seed: SEED });
    const cards = sec.querySelectorAll('.biome-card');
    const thermo = sec.querySelector('.thermo');
    const ORDER = ['intro', 'snow', 'forest', 'desert'];
    const TEMP = { intro: 0.5, snow: 0.08, forest: 0.5, desert: 0.93 };
    let active = null;

    function frame(name) {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      if (!W || !H) return;
      const mobile = vw() < 760;
      const fit = Math.min((vw() * 0.95) / W, (vh() * 0.9) / H);
      const focus = name === 'intro' ? { x: 0.5, y: 0.5 } : island.biomeCenter(name);
      const scale = name === 'intro' ? fit : fit * 2.3;
      const tx = mobile ? vw() * 0.5 : vw() * (name === 'intro' ? 0.62 : 0.7);
      const ty = mobile ? vh() * 0.62 : vh() * 0.5;
      const mx = tx - vw() / 2 - scale * (focus.x - 0.5) * W;
      const my = ty - vh() / 2 - scale * (focus.y - 0.5) * H;
      canvas.style.setProperty('--mx', mx.toFixed(1) + 'px');
      canvas.style.setProperty('--my', my.toFixed(1) + 'px');
      canvas.style.setProperty('--ms', scale.toFixed(3));
    }

    function set(name) {
      if (name === active) return;
      active = name;
      sec.dataset.active = name;
      cards.forEach((c) => c.classList.toggle('is-active', c.dataset.biome === name));
      if (thermo) thermo.style.setProperty('--t', TEMP[name]);
      frame(name);
    }
    M.onScene(sec, (p) => {
      const idx = p < 0.14 ? 0 : p < 0.42 ? 1 : p < 0.7 ? 2 : 3;
      set(ORDER[idx]);
    });
    set('intro');
    window.addEventListener('resize', () => frame(active));
  })();

  /* ---------------- 04 death ladder clock ---------------- */
  (function () {
    const sec = document.getElementById('muerte');
    const clock = document.getElementById('death-clock');
    if (!sec || !clock) return;
    const TIMES = ['00:15:00', '00:30:00', '00:45:00', '01:00:00', '02:00:00'];
    const rows = sec.querySelectorAll('.ladder li');
    let last = -1;
    M.onScene(sec, (p) => {
      const k = clamp((p - 0.3) * 4);
      const idx = Math.max(0, Math.min(4, Math.ceil(k * 5) - 1));
      if (idx === last) return;
      last = idx;
      clock.textContent = TIMES[idx];
      rows.forEach((r, i) => r.classList.toggle('is-now', i === idx));
    });
  })();

  /* ---------------- 05 clans converge ---------------- */
  (function () {
    const sec = document.getElementById('clanes');
    const canvas = document.getElementById('island-clans');
    const layer = document.getElementById('clan-markers');
    if (!sec || !canvas || !layer) return;
    const island = DXIsland.create(canvas, { seed: SEED, sparkle: false });
    const rng = DXIsland.rng(31);
    const meet = island.biomeCenter('forest');
    const players = [
      { name: 'Tú', color: '#a4f5c9', from: island.randomLand('forest', rng) },
      { name: 'Jugador 2', color: '#f3b45e', from: island.randomLand('desert', rng) },
      { name: 'Jugador 3', color: '#bfe3ff', from: island.randomLand('snow', rng) },
      { name: 'Jugador 4', color: '#c78bff', from: island.randomLand(null, rng) },
    ];
    players.forEach((pl, i) => {
      const el = document.createElement('span');
      el.className = 'cm';
      if (i === 0) el.dataset.name = pl.name;
      el.title = pl.name;
      el.style.color = pl.color;
      layer.appendChild(el);
      pl.el = el;
      // each arrives at a slightly different moment
      pl.start = 0.18 + i * 0.05;
      pl.end = 0.5 + i * 0.06;
      pl.to = { x: meet.x + (i % 2 ? 0.03 : -0.03), y: meet.y + (i > 1 ? 0.045 : -0.045) };
    });
    const slots = sec.querySelectorAll('.clan-slot');
    const count = document.getElementById('clan-count');
    M.onScene(sec, (p) => {
      let arrived = 0;
      players.forEach((pl, i) => {
        const k = i === 0 ? 1 : clamp((p - pl.start) / (pl.end - pl.start));
        const e = 1 - Math.pow(1 - k, 3);
        const x = pl.from.x + (pl.to.x - pl.from.x) * e;
        const y = pl.from.y + (pl.to.y - pl.from.y) * e;
        pl.el.style.left = (x * 100).toFixed(2) + '%';
        pl.el.style.top = (y * 100).toFixed(2) + '%';
        if (i === 0 || k >= 1) arrived++;
      });
      slots.forEach((s, i) => s.classList.toggle('on', i < arrived));
      if (count) count.textContent = arrived;
    });
  })();

  /* ---------------- 06 event wheel ---------------- */
  (function () {
    const sec = document.getElementById('eventos');
    const svg = document.getElementById('event-wheel');
    const list = document.getElementById('event-list');
    if (!sec || !svg || !list) return;
    // The list itself is static HTML (readable without JS); the wheel is
    // drawn from the same items so the two can never drift apart.
    const EVENTS = Array.from(list.querySelectorAll('.event-item')).map((li) => ({ c: li.dataset.color }));
    const N = EVENTS.length;
    const R = 100;
    const seg = (i) => {
      const a0 = ((i / N) * 360 - 90 - 180 / N) * (Math.PI / 180);
      const a1 = (((i + 1) / N) * 360 - 90 - 180 / N) * (Math.PI / 180);
      return `M0 0 L${(R * Math.cos(a0)).toFixed(2)} ${(R * Math.sin(a0)).toFixed(2)} A${R} ${R} 0 0 1 ${(R * Math.cos(a1)).toFixed(2)} ${(R * Math.sin(a1)).toFixed(2)} Z`;
    };
    svg.innerHTML =
      `<circle r="108" fill="#020807"/>` +
      EVENTS.map((e, i) => `<path class="seg" d="${seg(i)}" fill="${e.c}" stroke="#020807" stroke-width="3"/>`).join('') +
      EVENTS.map((e, i) => {
        const a = ((i / N) * 360 - 90) * (Math.PI / 180);
        return `<rect x="${(68 * Math.cos(a) - 5).toFixed(1)}" y="${(68 * Math.sin(a) - 5).toFixed(1)}" width="10" height="10" fill="rgba(0,0,0,.25)"/>`;
      }).join('') +
      `<circle r="100" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="2"/>`;
    const segs = svg.querySelectorAll('.seg');
    const items = list.querySelectorAll('.event-item');
    let last = -1;
    M.onScene(sec, (p) => {
      // With reduced motion the wheel stays still and only the highlighted
      // colour changes as you scroll.
      const rot = p * 900;
      if (!M.reduced) svg.style.setProperty('--rot', rot.toFixed(1) + 'deg');
      // segment under the pointer (top): undo the rotation
      const idx = ((Math.round(((360 - (rot % 360)) % 360) / (360 / N)) % N) + N) % N;
      if (idx === last) return;
      last = idx;
      segs.forEach((s, i) => s.classList.toggle('dim', i !== idx));
      items.forEach((it, i) => it.classList.toggle('is-active', i === idx));
    });
  })();

  /* ---------------- hotbar: scrollspy + visibility ---------------- */
  (function () {
    const bar = document.getElementById('hotbar');
    if (!bar) return;
    const links = Array.from(bar.querySelectorAll('a[data-target]'));
    const label = document.getElementById('hotbar-label');
    const chapters = Array.from(document.querySelectorAll('[data-chapter]'));
    const footer = document.querySelector('.site-footer');
    const heroEl = document.getElementById('inicio');
    let activeIdx = -1;
    let labelTimer = null;
    const xp = bar.querySelector('.xp-bar span');
    M.onScroll(({ vh: h, progress }) => {
      if (xp) xp.style.transform = `scaleX(${Math.min(1, Math.max(0, progress)).toFixed(4)})`;
      const heroBottom = heroEl ? heroEl.getBoundingClientRect().bottom : 0;
      const footTop = footer ? footer.getBoundingClientRect().top : Infinity;
      bar.classList.toggle('is-visible', heroBottom < h * 0.6 && footTop > h - 40);
      const mid = h * 0.45;
      let idx = -1;
      chapters.forEach((c) => {
        const r = c.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) idx = Number(c.dataset.chapter);
      });
      if (idx === activeIdx) return;
      activeIdx = idx;
      if (idx < 0) {
        links.forEach((a) => {
          a.classList.remove('is-active');
          a.removeAttribute('aria-current');
        });
        return;
      }
      links.forEach((a) => {
        const on = Number(a.dataset.target) === idx;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
      const cur = links.find((a) => Number(a.dataset.target) === idx);
      if (label && cur) {
        label.textContent = cur.title;
        label.classList.add('show');
        clearTimeout(labelTimer);
        labelTimer = setTimeout(() => label.classList.remove('show'), 1600);
      }
    });
  })();

  /* ---------------- achievements (advancement toasts) ---------------- */
  const seen = new Set();
  try {
    JSON.parse(sessionStorage.getItem('dx-adv') || '[]').forEach((k) => seen.add(k));
  } catch (err) {}
  let advQueue = Promise.resolve();
  function achievement(name, icon) {
    if (seen.has(name)) return;
    seen.add(name);
    try {
      sessionStorage.setItem('dx-adv', JSON.stringify(Array.from(seen)));
    } catch (err) {}
    advQueue = advQueue.then(
      () =>
        new Promise((resolve) => {
          const el = document.createElement('div');
          el.className = 'adv-toast';
          el.setAttribute('role', 'status');
          el.innerHTML = `<span class="adv-icon">${DXPixel.svg(icon || 'map', { className: 'px-icon' })}</span><div><b>¡Logro conseguido!</b><span class="adv-name"></span></div>`;
          el.querySelector('.adv-name').textContent = name;
          document.body.appendChild(el);
          setTimeout(() => {
            el.remove();
            resolve();
          }, M.reduced ? 3000 : 4700);
        })
    );
  }
  (function () {
    if (!('IntersectionObserver' in window)) return;
    const icons = { 1: 'pickaxe', 2: 'bench', 3: 'thermo', 4: 'hourglass', 5: 'clan', 6: 'wheel', 7: 'heart' };
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          achievement(e.target.dataset.achievement, icons[e.target.dataset.chapter]);
        });
      },
      { threshold: 0, rootMargin: '-45% 0px -50% 0px' }
    );
    document.querySelectorAll('[data-achievement]').forEach((el) => io.observe(el));
  })();

  /* ---------------- latest announcements ---------------- */
  (function () {
    const section = document.getElementById('anuncios');
    const grid = document.getElementById('news-grid');
    if (!section || !grid) return;
    fetch('/api/announcements')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const items = Array.isArray(data && data.announcements) ? data.announcements.slice(0, 3) : [];
        if (!items.length) return;
        grid.innerHTML = items.map((a, i) => DXPosts.card(a, { featured: i === 0 })).join('');
        section.hidden = false;
        M.refresh();
      })
      .catch(() => {});
  })();

  /* ---------------- team ---------------- */
  (function () {
    const section = document.getElementById('equipo');
    const wrap = document.getElementById('team-groups');
    if (!section || !wrap) return;
    fetch('/api/team')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const members = Array.isArray(data && data.members) ? data.members : [];
        if (!members.length) return;
        const groups = [
          { title: 'Staff', list: members.filter((m) => m.team === 'staff') },
          { title: 'Desarrollo', list: members.filter((m) => m.team === 'dev') },
          { title: 'Equipo', list: members.filter((m) => m.team !== 'staff' && m.team !== 'dev') },
        ].filter((g) => g.list.length);
        wrap.innerHTML = groups
          .map(
            (g) => `<div class="team-group"><h3 class="team-group-title" data-reveal="up">${DX.escapeHtml(g.title)}</h3>
              <div class="team-grid">${g.list.map(teamCard).join('')}</div></div>`
          )
          .join('');
        wrap.querySelectorAll('.team-card-img img').forEach((img) =>
          img.addEventListener(
            'error',
            () => {
              const box = img.parentElement;
              img.remove();
              box.insertAdjacentHTML('beforeend', '<svg class="team-card-fallback" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.5-7 8-7s8 3 8 7"/></svg>');
            },
            { once: true }
          )
        );
        section.hidden = false;
        M.refresh();
        // Arriving via /#equipo from another page: the browser tried to
        // scroll while the section was still hidden, so do it now.
        if (location.hash === '#equipo') section.scrollIntoView();
      })
      .catch(() => {});

    function teamCard(m, i) {
      const esc = DX.escapeHtml;
      const nick = String(m.mc_nick || '');
      const color = DX.safeColor(m.rank_color, '#37d6b4');
      const subject = encodeURIComponent(m.mc_uuid || nick);
      return `
        <article class="team-card" style="--rank:${color}" data-reveal="up" data-delay="${((i % 4) * 0.06).toFixed(2)}">
          <div class="team-card-img"><img src="https://vzge.me/full/300/${esc(subject)}" alt="Skin de ${esc(nick)}" loading="lazy" decoding="async"></div>
          <div class="team-card-body">
            <h4 class="team-card-name">${esc(nick)}</h4>
            ${m.rank_label ? `<span class="rank-pill"><span class="rank-swatch"></span>${esc(m.rank_label)}</span>` : ''}
            ${m.function_text ? `<p class="team-card-fn">${esc(m.function_text)}</p>` : ''}
          </div>
        </article>`;
    }
  })();
})();
