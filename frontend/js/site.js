/* ==========================================================================
   site.js · shared shell for every public page (+ utilities reused by the
   admin panel and Dev Zone through window.DX).

   window.DX exposes:
     DX.me          Promise<{ user, csrfToken }> (ONE /api/auth/me per page
                    load: every script awaits this instead of refetching it,
                    each call costs a KV read against the free-tier quota)
     DX.escapeHtml, DX.formatDate, DX.relTime, DX.toast, DX.loginUrl,
     DX.safeColor, DX.defaultAvatar
   ========================================================================== */
(function () {
  const DX = (window.DX = window.DX || {});

  DX.escapeHtml = function (str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  };

  DX.formatDate = function (iso, opts) {
    const d = parseDate(iso);
    if (!d) return '';
    return d.toLocaleDateString('es-ES', opts || { day: 'numeric', month: 'short', year: 'numeric' });
  };

  /** "hace 3 h" style relative time; absolute date past ~a month. */
  DX.relTime = function (iso) {
    const d = parseDate(iso);
    if (!d) return '';
    const diff = (d.getTime() - Date.now()) / 1000;
    const abs = Math.abs(diff);
    const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
    if (abs < 45) return 'ahora mismo';
    if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
    if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
    return DX.formatDate(iso);
  };

  /** D1's datetime('now') returns "YYYY-MM-DD HH:MM:SS" in UTC with no zone
   *  marker, which browsers parse as LOCAL time (off by 1-2 h in Spain).
   *  Normalize it to real UTC before formatting anything. */
  function parseDate(iso) {
    if (!iso) return null;
    let s = String(iso);
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) s = s.replace(' ', 'T') + 'Z';
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  DX.parseDate = parseDate;

  DX.safeColor = function (c, fallback) {
    return /^#[0-9a-fA-F]{3,8}$/.test(c || '') ? c : fallback || '#37d6b4';
  };

  DX.defaultAvatar =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="12" fill="#123029"/><circle cx="12" cy="9.5" r="3.5" fill="#4d7a6d"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" fill="#4d7a6d"/></svg>'
    );

  DX.loginUrl = function () {
    return `/api/auth/login?return_to=${encodeURIComponent(location.pathname + location.search)}`;
  };

  /* ---------- toasts ---------- */
  const TOAST_ICONS = {
    ok: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
    error: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/></svg>',
    info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/></svg>',
  };
  DX.toast = function (message, type, opts) {
    type = type || 'ok';
    opts = opts || {};
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `${TOAST_ICONS[type] || TOAST_ICONS.info}<div class="toast-body"></div>`;
    el.querySelector('.toast-body').textContent = message;
    stack.appendChild(el);
    const ms = opts.duration || (type === 'error' ? 6500 : 3500);
    const close = () => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 260);
    };
    const timer = setTimeout(close, ms);
    el.addEventListener('click', () => {
      clearTimeout(timer);
      close();
    });
    return el;
  };

  /* ---------- confirm dialog (replaces window.confirm) ---------- */
  DX.confirm = function (message, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'dialog-overlay';
      overlay.innerHTML = `
        <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dx-confirm-title">
          <h2 id="dx-confirm-title"></h2>
          <p></p>
          <div class="dialog-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-act="cancel">Cancelar</button>
            <button type="button" class="btn ${opts.danger === false ? 'btn-accent' : 'btn-danger'} btn-sm" data-act="ok"></button>
          </div>
        </div>`;
      overlay.querySelector('h2').textContent = opts.title || '¿Seguro?';
      overlay.querySelector('p').textContent = message;
      overlay.querySelector('[data-act="ok"]').textContent = opts.okLabel || 'Eliminar';
      const prevFocus = document.activeElement;
      function done(v) {
        overlay.remove();
        document.removeEventListener('keydown', onKey, true);
        if (prevFocus && prevFocus.focus) prevFocus.focus();
        resolve(v);
      }
      function onKey(e) {
        if (e.key === 'Escape') {
          e.stopPropagation();
          done(false);
        }
      }
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) done(false);
        const act = e.target.closest('[data-act]');
        if (act) done(act.dataset.act === 'ok');
      });
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(overlay);
      // keep Tab inside the dialog
      overlay.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;
        const btns = overlay.querySelectorAll('button');
        const first = btns[0];
        const last = btns[btns.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      });
      overlay.querySelector('[data-act="cancel"]').focus();
    });
  };

  /** Turns GitHub-style callouts in rendered markdown
   *  (> [!TIP] / [!NOTE] / [!WARNING] / [!DANGER]) into styled boxes.
   *  Shared by the public wiki, the admin preview and Dev Zone. */
  DX.mdCallouts = function (container) {
    const map = { NOTE: ['note', 'Nota'], IMPORTANT: ['note', 'Importante'], TIP: ['tip', 'Consejo'], WARNING: ['warning', 'Atención'], CAUTION: ['warning', 'Cuidado'], DANGER: ['danger', 'Peligro'] };
    container.querySelectorAll('blockquote').forEach((bq) => {
      const first = bq.querySelector('p');
      if (!first) return;
      const m = first.innerHTML.match(/^\s*\[!(NOTE|TIP|WARNING|DANGER|IMPORTANT|CAUTION)\]\s*(<br>)?/i);
      if (!m) return;
      const [cls, label] = map[m[1].toUpperCase()];
      first.innerHTML = first.innerHTML.slice(m[0].length);
      if (!first.textContent.trim() && !first.querySelector('img')) first.remove();
      bq.classList.add('callout', 'callout-' + cls);
      const title = document.createElement('div');
      title.className = 'callout-title';
      title.textContent = label;
      bq.prepend(title);
    });
  };

  /* ---------- session (one request per page) ---------- */
  DX.me = fetch('/api/auth/me', { credentials: 'include' })
    .then((r) => (r.ok ? r.json() : { user: null, csrfToken: '' }))
    .catch(() => ({ user: null, csrfToken: '' }));

  DX.hasPerm = function (user, key) {
    return !!(user && Array.isArray(user.permissions) && user.permissions.includes(key));
  };
})();

/* ---------- nav: scrolled state, hide on scroll down, progress ---------- */
(function () {
  const nav = document.querySelector('.site-nav');
  const bar = document.querySelector('.scroll-progress');
  let lastY = window.scrollY;
  let ticking = false;
  function update() {
    ticking = false;
    const y = window.scrollY;
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    if (bar) bar.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : 0);
    if (nav) {
      nav.classList.toggle('is-scrolled', y > 24);
      const menuOpen = document.body.classList.contains('menu-open');
      const accountOpen = !!document.querySelector('.account-wrap.open');
      if (!menuOpen && !accountOpen) {
        if (y > lastY + 4 && y > 260) nav.classList.add('is-hidden');
        else if (y < lastY - 4 || y < 260) nav.classList.remove('is-hidden');
      }
    }
    lastY = y;
  }
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  update();

  /* active link: exact page match (hash links are never "current") */
  const here = (location.pathname.replace(/\/+$/, '').split('/').pop() || 'index').replace('.html', '') || 'index';
  document.querySelectorAll('.nav-links a, .mobile-menu nav a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (!href || href.includes('#') || href.startsWith('/invite') || /^https?:/.test(href)) return;
    const target = (href.replace(/^\//, '').split('?')[0].replace('.html', '') || 'index');
    const isPostPage = location.pathname.startsWith('/anuncios/') && target === 'anuncios';
    if (target === here || isPostPage) a.setAttribute('aria-current', 'page');
  });

  /* mobile menu */
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.mobile-menu');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    if (toggle) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    }
    if (menu) menu.toggleAttribute('inert', !open);
    // Everything behind the full-screen menu is taken out of the tab order.
    document.querySelectorAll('main, .site-footer, .hotbar').forEach((el) => el.toggleAttribute('inert', open));
    if (open && nav) nav.classList.remove('is-hidden');
    if (open && menu) {
      const first = menu.querySelector('a');
      if (first) setTimeout(() => first.focus(), 50);
    }
  }
  if (toggle && menu) {
    setMenu(false);
    toggle.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) {
        setMenu(false);
        toggle.focus();
      }
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => {
      if (e.matches) setMenu(false);
    });
  }
})();

/* ---------- cursor spotlight on .spot cards ---------- */
(function () {
  if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  document.addEventListener(
    'pointermove',
    (e) => {
      const el = e.target.closest && e.target.closest('.spot');
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', e.clientX - r.left + 'px');
      el.style.setProperty('--my', e.clientY - r.top + 'px');
    },
    { passive: true }
  );
})();

/* ---------- pixel dust: slow square motes drifting up (one canvas) ---------- */
(function () {
  const canvas = document.getElementById('dust');
  if (!canvas || !canvas.getContext) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // Phones: skip it. A canvas repainting every frame under blurred layers is
  // the most expensive thing on the page for a purely decorative effect.
  if (!window.matchMedia('(hover:hover)').matches) return;
  const ctx = canvas.getContext('2d');
  const COLORS = ['164,245,201', '55,214,180', '233,247,240'];
  let w = 0, h = 0, dpr = 1, motes = [], running = true, raf = null;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = w < 700 ? 16 : 38;
    motes = Array.from({ length: count }, () => spawn(true));
  }
  function spawn(anywhere) {
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      s: Math.random() < 0.15 ? 3 : 2,
      vy: 0.12 + Math.random() * 0.3,
      vx: (Math.random() - 0.5) * 0.12,
      a: 0.08 + Math.random() * 0.35,
      c: COLORS[(Math.random() * COLORS.length) | 0],
      tw: Math.random() * Math.PI * 2,
    };
  }
  function tick() {
    raf = null;
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    for (const m of motes) {
      m.y -= m.vy;
      m.x += m.vx;
      m.tw += 0.02;
      if (m.y < -10) Object.assign(m, spawn(false));
      const alpha = m.a * (0.6 + 0.4 * Math.sin(m.tw));
      ctx.fillStyle = `rgba(${m.c},${alpha.toFixed(3)})`;
      ctx.fillRect(Math.round(m.x), Math.round(m.y), m.s, m.s);
    }
    raf = requestAnimationFrame(tick);
  }
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running && !raf) raf = requestAnimationFrame(tick);
  });
  let lastW = 0;
  window.addEventListener('resize', () => {
    if (window.innerWidth !== lastW) resize();
  });
  resize();
  lastW = window.innerWidth;
  raf = requestAnimationFrame(tick);
})();

/* ---------- copy server IP buttons ---------- */
(function () {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const value = btn.getAttribute('data-copy');
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      window.DX.toast('IP copiada al portapapeles.', 'ok');
    } catch (err) {
      window.DX.toast('No se pudo copiar. IP: ' + value, 'info');
    }
  });
})();

/* ---------- Discord session: account chip in the nav + mobile menu ---------- */
(function () {
  const DX = window.DX;
  const slot = document.getElementById('account-slot');
  const mobileSlot = document.getElementById('mobile-account');
  if (!slot && !mobileSlot) return;

  const DISCORD_ICON =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.3 4.4A19.8 19.8 0 0015.6 3l-.3.6a14 14 0 014.1 1.6 17 17 0 00-14.8 0A14 14 0 018.7 3.6L8.4 3a19.7 19.7 0 00-4.7 1.4C1 9 .3 13.5.6 18a20 20 0 006 3l1-1.4a12.8 12.8 0 01-1.9-.9l.5-.4a14.3 14.3 0 0011.6 0l.5.4c-.6.4-1.2.6-1.9.9l1 1.4a20 20 0 006-3c.4-5.2-.9-9.7-3.1-13.6zM8.5 15c-1 0-1.8-1-1.8-2s.8-2 1.8-2 1.9 1 1.8 2c0 1-.8 2-1.8 2zm7 0c-1 0-1.8-1-1.8-2s.8-2 1.8-2 1.9 1 1.8 2c0 1-.8 2-1.8 2z"/></svg>';

  DX.me.then((data) => {
    if (data && data.user) renderAccount(data.user, data.csrfToken);
    else renderLogin();
  });

  function renderLogin() {
    if (slot) {
      const a = document.createElement('a');
      a.className = 'nav-login-btn';
      a.href = DX.loginUrl();
      a.innerHTML = `${DISCORD_ICON}<span>Iniciar sesión</span>`;
      slot.appendChild(a);
    }
    if (mobileSlot) {
      mobileSlot.innerHTML = `<a class="btn btn-discord" href="${DX.escapeHtml(DX.loginUrl())}">${DISCORD_ICON}Iniciar sesión con Discord</a>`;
    }
  }

  function renderAccount(user, csrfToken) {
    const avatar = DX.escapeHtml(user.avatar || DX.defaultAvatar);
    const top = (user.roles || [])[0] || null;
    const roleLabel = top ? top.name : 'Miembro';
    const roleColor = DX.safeColor(top && top.color, '#a4f5c9');
    const canPanel = DX.hasPerm(user, 'panel.access');
    const canDev = DX.hasPerm(user, 'devzone.access');
    const name = DX.escapeHtml(user.username || 'Jugador');

    if (slot) {
      const wrap = document.createElement('div');
      wrap.className = 'account-wrap';
      wrap.innerHTML = `
        <button type="button" class="account-chip" aria-expanded="false" aria-label="Tu cuenta">
          <img class="account-avatar" src="${avatar}" alt="">
          <span class="account-name">${name}</span>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="account-dropdown">
          <div class="account-dropdown-head">
            <img src="${avatar}" alt="">
            <div>
              <p class="account-dropdown-name">${name}</p>
              <p class="account-dropdown-role" style="color:${roleColor}">${DX.escapeHtml(roleLabel)}</p>
            </div>
          </div>
          <div class="account-dropdown-links">
            ${canPanel ? `<a href="/admin.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/></svg>Panel de administración</a>` : ''}
            ${canDev ? `<a href="/devzone.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16"/></svg>Dev Zone</a>` : ''}
            ${canPanel || canDev ? '<div class="divider"></div>' : ''}
            <button type="button" data-logout><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>Cerrar sesión</button>
          </div>
        </div>`;
      slot.appendChild(wrap);
      const chip = wrap.querySelector('.account-chip');
      const setOpen = (open) => {
        wrap.classList.toggle('open', open);
        chip.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpen(!wrap.classList.contains('open'));
      });
      document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) setOpen(false);
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && wrap.classList.contains('open')) {
          setOpen(false);
          chip.focus();
        }
      });
      wrap.addEventListener('focusout', (e) => {
        if (!wrap.contains(e.relatedTarget)) setOpen(false);
      });
    }

    if (mobileSlot) {
      mobileSlot.innerHTML = `
        <div class="mobile-account-row"><img src="${avatar}" alt=""><span>${name}</span></div>
        ${canPanel ? '<a href="/admin.html">Panel de administración</a>' : ''}
        ${canDev ? '<a href="/devzone.html">Dev Zone</a>' : ''}
        <button type="button" data-logout>Cerrar sesión</button>`;
    }

    document.addEventListener('click', async (e) => {
      if (!e.target.closest('[data-logout]')) return;
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include', headers: { 'X-CSRF-Token': csrfToken || '' } });
      } catch (err) {}
      location.reload();
    });
  }
})();
