(function () {
  const field = document.getElementById('field');
  if (!field) return;
  const count = window.innerWidth < 700 ? 50 : 110;
  for (let i = 0; i < count; i++) {
    const m = document.createElement('div');
    const big = Math.random() < 0.08;
    m.className = big ? 'mote big' : 'mote';
    const s = big ? Math.random() * 1.6 + 2.2 : Math.random() * 1.4 + 0.5;
    m.style.width = s + 'px';
    m.style.height = s + 'px';
    m.style.top = Math.random() * 100 + 'vh';
    m.style.left = Math.random() * 100 + 'vw';
    m.style.animationDuration = 2.5 + Math.random() * 6 + 's';
    m.style.animationDelay = Math.random() * 6 + 's';
    field.appendChild(m);
  }
})();

/* ---------- shooting stars ---------- */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const STAR_DURATION_MS = 1150;
  const MAX_CONCURRENT = 3;
  let liveCount = 0;
  let pendingTimer = null;

  function purgeAll() {
    document.querySelectorAll('.shooting-star').forEach((el) => el.remove());
    liveCount = 0;
  }

  function spawn() {
    if (liveCount >= MAX_CONCURRENT) return;
    liveCount++;

    const star = document.createElement('div');
    star.className = 'shooting-star';
    // Travel angle in standard screen atan2 terms (0deg = right, 90deg = down):
    // 148-166deg points down-and-left, matching the trail's own rotation math.
    const angleDeg = 148 + Math.random() * 18;
    const dist = 380 + Math.random() * 140;
    const rad = (angleDeg * Math.PI) / 180;
    const dx = Math.cos(rad) * dist;
    const dy = Math.sin(rad) * dist;
    star.style.top = Math.random() * 45 + 'vh';
    star.style.left = 55 + Math.random() * 35 + 'vw';
    star.style.setProperty('--ang', angleDeg + 'deg');
    star.style.setProperty('--dx', dx + 'px');
    star.style.setProperty('--dy', dy + 'px');
    document.body.appendChild(star);

    // Belt-and-suspenders removal: `animationend` doesn't reliably fire while
    // the tab is hidden/minimized (no rendering happening), which otherwise
    // lets spawned stars pile up silently and all animate at once the moment
    // the tab becomes visible again ("un ejército de cometas"). A plain
    // timer removes it regardless of whether the animation event ever fires.
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      star.remove();
      liveCount--;
    };
    star.addEventListener('animationend', finish);
    setTimeout(finish, STAR_DURATION_MS + 200);
  }

  function scheduleNext() {
    const next = 4000 + Math.random() * 6000;
    pendingTimer = setTimeout(() => {
      spawn();
      scheduleNext();
    }, next);
  }

  // While the tab is hidden, timers get throttled rather than paused, so
  // stop scheduling new spawns entirely and wipe anything left over the
  // moment the tab is visible again, instead of letting a backlog render.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (pendingTimer) clearTimeout(pendingTimer);
      pendingTimer = null;
    } else {
      purgeAll();
      scheduleNext();
    }
  });

  pendingTimer = setTimeout(() => {
    spawn();
    scheduleNext();
  }, 2000);
})();

/* ---------- subtle background parallax ---------- */
(function () {
  if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const field = document.getElementById('field');
  const nebulaField = document.getElementById('nebula-field');
  if (!field && !nebulaField) return;
  document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    if (field) field.style.transform = `translate(${x * -10}px, ${y * -10}px)`;
    if (nebulaField) nebulaField.style.transform = `translate(${x * 14}px, ${y * 14}px)`;
  });
})();

window.bindReveal = function () {
  const els = document.querySelectorAll('.reveal:not([data-reveal-bound])');
  if (!els.length) return;
  els.forEach((el, idx) => {
    el.dataset.revealBound = '1';
    el.style.transitionDelay = idx % 4 * 0.06 + 's';
  });
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.14 }
  );
  els.forEach((el) => io.observe(el));
};
window.bindReveal();

/* ---------- scroll progress bar ---------- */
(function () {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  const onScroll = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const pct = max > 0 ? (doc.scrollTop / max) * 100 : 0;
    bar.style.width = pct + '%';
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();

/* ---------- active nav link ---------- */
(function () {
  const path = location.pathname.replace(/\/+$/, '') || '/index';
  const here = path.endsWith('/') || path === '' ? 'index' : path.split('/').pop().replace('.html', '') || 'index';
  document.querySelectorAll('.nav-links a, .mobile-sheet a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('/invite')) return;
    const target = href.replace('.html', '') || 'index';
    if (target === here) a.classList.add('active');
  });
})();

/* ---------- 3D tilt on cards ---------- */
(function () {
  if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const SEL = '.post-card, .team-card';
  let current = null;

  function release(card) {
    card.style.transition = '';
    card.style.transform = '';
  }

  document.addEventListener('mousemove', (e) => {
    const card = e.target.closest(SEL);
    if (card !== current) {
      if (current) release(current);
      current = card;
      if (card) card.style.transition = 'none';
    }
    if (!card) return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(800px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) translateY(-4px)`;
  });
  document.addEventListener(
    'mouseleave',
    (e) => {
      if (current && (e.target === current || e.target === document)) {
        release(current);
        current = null;
      }
    },
    true
  );
})();

(function () {
  const nav = document.querySelector('.nav');
  const onScroll = () => {
    if (!nav) return;
    if (window.scrollY > 40) nav.classList.add('glass');
    else nav.classList.remove('glass');
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  document.querySelectorAll('[data-scroll]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const sel = el.getAttribute('data-scroll');
      const target = document.querySelector(sel);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
      closeSheet();
    });
  });

  const toggle = document.querySelector('.nav-toggle');
  const sheet = document.querySelector('.mobile-sheet');
  function closeSheet() {
    if (sheet) sheet.classList.remove('open');
  }
  if (toggle && sheet) {
    toggle.addEventListener('click', () => sheet.classList.toggle('open'));
    sheet.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeSheet));
  }
})();

/* ---------- Discord auth ---------- */
(function () {
  const corner = document.getElementById('account-corner');
  const mobileSheet = document.querySelector('.mobile-sheet');

  fetch('/api/auth/me', { credentials: 'include' })
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((data) => {
      if (data.user) renderAccountChip(data.user);
      else renderLoginButton();
    })
    .catch(() => {});

  function loginUrl() {
    return `/api/auth/login?return_to=${encodeURIComponent(location.pathname)}`;
  }

  const DISCORD_ICON =
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.3 4.4A19.8 19.8 0 0015.6 3l-.3.6a14 14 0 014.1 1.6 17 17 0 00-14.8 0A14 14 0 018.7 3.6L8.4 3a19.7 19.7 0 00-4.7 1.4C1 9 .3 13.5.6 18a20 20 0 006 3l1-1.4a12.8 12.8 0 01-1.9-.9l.5-.4a14.3 14.3 0 0011.6 0l.5.4c-.6.4-1.2.6-1.9.9l1 1.4a20 20 0 006-3c.4-5.2-.9-9.7-3.1-13.6zM8.5 15c-1 0-1.8-1-1.8-2s.8-2 1.8-2 1.9 1 1.8 2c0 1-.8 2-1.8 2zm7 0c-1 0-1.8-1-1.8-2s.8-2 1.8-2 1.9 1 1.8 2c0 1-.8 2-1.8 2z"/></svg>';

  function renderLoginButton() {
    const btn = document.createElement('a');
    btn.href = loginUrl();
    btn.className = 'nav-login-btn corner-fade-in';
    btn.innerHTML = `${DISCORD_ICON}Iniciar sesión`;
    if (corner) corner.appendChild(btn);

    if (mobileSheet) {
      const mBtn = btn.cloneNode(true);
      mBtn.classList.remove('nav-login-btn');
      mBtn.classList.add('btn', 'btn-discord');
      mBtn.style.marginTop = '18px';
      mobileSheet.insertBefore(mBtn, mobileSheet.lastElementChild);
    }
  }

  function renderAccountChip(user) {
    // user.avatar is built server-side from Discord's own id/avatar-hash
    // fields (see discordAvatarUrl() in backend/lib/discord.js), which are
    // never expected to contain HTML metacharacters — but it still goes
    // into an unquoted-safe attribute below via a template string, so
    // escape it as cheap defense in depth rather than trust an upstream
    // API's format forever.
    const avatarSrc = escapeHtml(user.avatar || defaultAvatarSvg());
    const topRole = (user.roles || [])[0] || null;
    const roleLabel = topRole ? topRole.name : 'Miembro';
    const roleColor = topRole ? topRole.color : 'var(--accent)';
    const canPanel = Array.isArray(user.permissions) && user.permissions.includes('panel.access');
    const panelLink = canPanel
      ? `<a href="/admin.html">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/></svg>
           Panel de administración
         </a>`
      : '';

    if (corner) {
      const wrap = document.createElement('div');
      wrap.className = 'account-wrap corner-fade-in';
      wrap.innerHTML = `
        <button class="account-chip" id="account-chip-btn">
          <img class="account-avatar" src="${avatarSrc}" alt="">
          <span class="account-name">${escapeHtml(user.username)}</span>
          <span class="account-dot" style="background:${roleColor};box-shadow:0 0 6px ${roleColor}"></span>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="account-dropdown">
          <div class="account-dropdown-head">
            <img class="account-dropdown-avatar" src="${avatarSrc}" alt="">
            <div>
              <p class="account-dropdown-name">${escapeHtml(user.username)}</p>
              <p class="account-dropdown-role" style="color:${roleColor}">${escapeHtml(roleLabel)}</p>
            </div>
          </div>
          <div class="account-dropdown-links">
            ${panelLink}
            ${panelLink ? '<div class="divider"></div>' : ''}
            <button id="account-logout-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              Cerrar sesión
            </button>
          </div>
        </div>
      `;
      corner.appendChild(wrap);

      const chipBtn = wrap.querySelector('#account-chip-btn');
      chipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        wrap.classList.toggle('open');
      });
      document.addEventListener('click', () => wrap.classList.remove('open'));
      wrap.querySelector('#account-logout-btn').addEventListener('click', logout);
    }

    if (mobileSheet) {
      const row = document.createElement('div');
      row.className = 'mobile-account-row';
      row.innerHTML = `<img src="${avatarSrc}" alt=""><span>${escapeHtml(user.username)}</span>`;
      mobileSheet.insertBefore(row, mobileSheet.lastElementChild);
      if (canPanel) {
        const a = document.createElement('a');
        a.href = '/admin.html';
        a.textContent = 'Panel de administración';
        mobileSheet.insertBefore(a, mobileSheet.lastElementChild);
      }
      const logoutBtn = document.createElement('button');
      logoutBtn.className = 'mobile-logout';
      logoutBtn.textContent = 'Cerrar sesión';
      logoutBtn.addEventListener('click', logout);
      mobileSheet.appendChild(logoutBtn);
    }
  }

  async function logout() {
    try {
      const me = await fetch('/api/auth/me', { credentials: 'include' }).then((r) => r.json());
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': me.csrfToken || '' },
      });
    } catch (err) {}
    location.reload();
  }

  function defaultAvatarSvg() {
    return (
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="12" fill="#172038"/><circle cx="12" cy="9.5" r="3.5" fill="#54607f"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" fill="#54607f"/></svg>'
      )
    );
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }
})();
