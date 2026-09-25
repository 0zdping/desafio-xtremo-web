/* ==========================================================================
   app-ui.js · building blocks shared by the admin panel and Dev Zone.
   Requires site.js (window.DX) to be loaded first.

   DXApp.api(path, {method, body, form})    fetch wrapper (JSON + CSRF)
   DXApp.shell(opts)                        sidebar + hash router
   DXApp.drawer(opts)                       slide-over editor with dirty guard
   DXApp.cmdk.register(items)               Ctrl+K command palette
   DXApp.mdEditor(textarea, preview)        markdown source + live preview
   DXApp.lineChart(el, rows, opts)          SVG line chart with hover tooltip
   DXApp.icon(name)                         inline line icons
   ========================================================================== */
(function () {
  const DX = window.DX;
  const esc = DX.escapeHtml;
  let csrfToken = '';
  DX.me.then((s) => (csrfToken = (s && s.csrfToken) || ''));

  const ICONS = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>',
    news: '<path d="M4 5h13v14H6a2 2 0 01-2-2zM17 9h3v8a2 2 0 01-2 2M8 9h5M8 13h5"/>',
    book: '<path d="M4 4.5C4 3.7 4.7 3 5.5 3H12v18H5.5c-.8 0-1.5-.7-1.5-1.5zM20 4.5c0-.8-.7-1.5-1.5-1.5H12v18h6.5c.8 0 1.5-.7 1.5-1.5z"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6"/><circle cx="17" cy="8.5" r="2.6"/><path d="M16 14.2c2.6.5 4.5 2.6 4.5 5.3"/>',
    shield: '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/>',
    gavel: '<path d="M14 4l6 6M11 7l6 6M12.5 5.5l-5 5M18.5 11.5l-5 5M9 13l-6 6M3 21h9"/>',
    chart: '<path d="M4 19h16M7 15l3.5-4.5L14 14l4.5-6"/>',
    gauge: '<path d="M4 19h16M7 19V9m5 10V5m5 14v-7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    logout: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16"/>',
    pin: '<path d="M12 2l1.8 5.6L20 8l-4.6 4 1.4 6-4.8-3.4L7.2 18l1.4-6L4 8l6.2-.4z"/>',
    board: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="10" rx="1.5"/><rect x="17" y="4" width="4" height="13" rx="1.5"/>',
    scroll: '<path d="M7 3h11a2 2 0 012 2v2h-4M7 3a2 2 0 00-2 2v12a4 4 0 004 4h9a2 2 0 002-2v-3H9v3a2 2 0 01-4 0M9 8h7M9 12h5"/>',
    file: '<path d="M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8zM14 3v5h5M9 13h6M9 17h4"/>',
    broom: '<path d="M14 4l6 6M5 13l6 6M11 7l6 6-4 4-8-2-2-8z"/>',
    link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  };
  function icon(name, cls) {
    return `<svg class="${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  /* ---------- API ---------- */
  async function api(path, opts) {
    opts = opts || {};
    const method = opts.method || 'GET';
    const headers = {};
    let body;
    if (opts.form) body = opts.form;
    else if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
    if (method !== 'GET') {
      if (!csrfToken) {
        const s = await DX.me;
        csrfToken = (s && s.csrfToken) || '';
      }
      headers['X-CSRF-Token'] = csrfToken;
    }
    let res;
    try {
      res = await fetch(path, { method, headers, body, credentials: 'include' });
    } catch (err) {
      throw new Error('Sin conexión con el servidor.');
    }
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    const data = isJson ? await res.json().catch(() => null) : null;
    if (!res.ok) {
      const e = new Error((data && data.error) || `Error ${res.status}`);
      e.status = res.status;
      e.data = data;
      throw e;
    }
    return data;
  }

  /** Keeps Tab / Shift+Tab inside `container` while it is open. */
  function trapFocus(container) {
    function onKey(e) {
      if (e.key !== 'Tab') return;
      const items = Array.from(container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]')).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    container.addEventListener('keydown', onKey);
    return () => container.removeEventListener('keydown', onKey);
  }

  /* ---------- drawer ---------- */
  let openDrawer = null;
  let drawerSeq = 0;
  function drawer(opts) {
    // Never throw away unsaved work: if another editor is open and dirty,
    // ask first (and only open the new one if the user agrees).
    if (openDrawer) {
      if (openDrawer.isDirty()) {
        openDrawer.close().then((ok) => ok && drawer(opts));
        return null;
      }
      openDrawer.forceClose();
    }
    const overlay = document.createElement('div');
    overlay.className = 'drawer-overlay';
    const el = document.createElement('section');
    el.className = 'drawer' + (opts.wide ? ' wide' : '');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'drawer-title-' + (++drawerSeq));
    el.innerHTML = `
      <header class="drawer-head">
        <div><h2 id="drawer-title-${drawerSeq}">${esc(opts.title)} <span class="dirty-dot" title="Cambios sin guardar"></span></h2>${opts.subtitle ? `<p>${esc(opts.subtitle)}</p>` : ''}</div>
        <button type="button" class="icon-btn" data-close aria-label="Cerrar">${icon('close')}</button>
      </header>
      <form class="drawer-body" novalidate>${opts.body || ''}</form>
      <footer class="drawer-foot">
        ${opts.onDelete ? `<button type="button" class="btn btn-danger btn-sm" data-delete>${icon('trash')}${esc(opts.deleteLabel || 'Eliminar')}</button>` : ''}
        <span class="drawer-error" role="alert"></span>
        <span class="spacer"></span>
        <button type="button" class="btn btn-ghost btn-sm" data-close>Cancelar</button>
        ${opts.onSave ? `<button type="button" class="btn btn-accent btn-sm" data-save>${esc(opts.saveLabel || 'Guardar')}</button>` : ''}
      </footer>`;
    const form = el.querySelector('form');
    const errEl = el.querySelector('.drawer-error');
    const saveBtn = el.querySelector('[data-save]');
    let dirty = false;
    const prevFocus = document.activeElement;
    const markDirty = () => {
      dirty = true;
      el.classList.add('dirty');
    };
    form.addEventListener('input', markDirty);
    form.addEventListener('change', markDirty);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (saveBtn) saveBtn.click();
    });

    const releaseTrap = trapFocus(el);
    let busy = false;
    const api_ = {
      el,
      form,
      markDirty,
      isDirty: () => dirty,
      setError(msg) {
        errEl.textContent = msg || '';
      },
      async close() {
        if (dirty && !(await DX.confirm('Tienes cambios sin guardar. Si cierras ahora se perderán.', { title: '¿Descartar cambios?', okLabel: 'Descartar' }))) return false;
        api_.forceClose();
        return true;
      },
      forceClose() {
        document.removeEventListener('keydown', onKey, true);
        releaseTrap();
        el.classList.add('closing');
        overlay.remove();
        setTimeout(() => el.remove(), 240);
        if (openDrawer === api_) openDrawer = null;
        if (opts.onClose) opts.onClose();
        if (prevFocus && prevFocus.focus) prevFocus.focus();
      },
      value(name) {
        const f = form.elements[name];
        if (!f) return undefined;
        if (f.type === 'checkbox') return f.checked;
        return f.value;
      },
    };
    function onKey(e) {
      // A dialog or the command palette on top owns the keyboard.
      if (document.querySelector('.dialog-overlay, .cmdk-overlay')) return;
      if (e.key === 'Escape' && !(e.target.closest && e.target.closest('.ql-tooltip'))) {
        e.stopPropagation();
        api_.close();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && saveBtn) {
        e.preventDefault();
        saveBtn.click();
      }
    }
    el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => api_.close()));
    overlay.addEventListener('click', () => api_.close());
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        if (busy) return;
        busy = true;
        errEl.textContent = '';
        saveBtn.disabled = true;
        const label = saveBtn.textContent;
        saveBtn.textContent = 'Guardando…';
        try {
          const ok = await opts.onSave(api_);
          if (ok !== false) {
            dirty = false;
            api_.forceClose();
          }
        } catch (err) {
          errEl.textContent = err.message || 'No se pudo guardar.';
        } finally {
          busy = false;
          saveBtn.disabled = false;
          saveBtn.textContent = label;
        }
      });
    }
    const delBtn = el.querySelector('[data-delete]');
    if (delBtn) {
      delBtn.addEventListener('click', async () => {
        if (busy) return;
        if (!(await DX.confirm(opts.deleteConfirm || 'Esta acción no se puede deshacer.', { title: opts.deleteTitle || '¿Eliminar?' }))) return;
        busy = true;
        delBtn.disabled = true;
        if (saveBtn) saveBtn.disabled = true;
        try {
          await opts.onDelete(api_);
          dirty = false;
          api_.forceClose();
        } catch (err) {
          errEl.textContent = err.message || 'No se pudo eliminar.';
        } finally {
          busy = false;
          delBtn.disabled = false;
          if (saveBtn) saveBtn.disabled = false;
        }
      });
    }
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(overlay);
    document.body.appendChild(el);
    openDrawer = api_;
    if (opts.onOpen) opts.onOpen(api_);
    const first = form.querySelector('input:not([type=hidden]):not([disabled]), textarea, select');
    if (first) setTimeout(() => first.focus(), 60);
    return api_;
  }

  /* ---------- command palette ---------- */
  const cmdk = (function () {
    let items = [];
    let overlay = null;
    function register(list) {
      items = list;
    }
    let prevFocus = null;
    let release = null;
    function close() {
      if (overlay) overlay.remove();
      overlay = null;
      if (release) release();
      release = null;
      if (prevFocus && prevFocus.focus) prevFocus.focus();
    }
    function open() {
      if (overlay) return;
      prevFocus = document.activeElement;
      overlay = document.createElement('div');
      overlay.className = 'cmdk-overlay';
      overlay.innerHTML = `<div class="cmdk" role="dialog" aria-modal="true" aria-label="Buscar"><input type="text" placeholder="Busca una sección o una acción…" aria-label="Buscar" role="combobox" aria-expanded="true" aria-controls="cmdk-list"><ul id="cmdk-list" role="listbox"></ul></div>`;
      document.body.appendChild(overlay);
      release = trapFocus(overlay);
      const input = overlay.querySelector('input');
      const list = overlay.querySelector('ul');
      let sel = 0;
      let visible = [];
      const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      function render() {
        const q = norm(input.value.trim());
        visible = items.filter((it) => !q || norm(it.label + ' ' + (it.group || '') + ' ' + (it.keywords || '')).includes(q));
        if (sel >= visible.length) sel = 0;
        let lastGroup = null;
        list.innerHTML =
          visible
            .map((it, i) => {
              const g = it.group && it.group !== lastGroup ? `<li class="cmdk-group" role="presentation">${esc(it.group)}</li>` : '';
              lastGroup = it.group;
              return `${g}<li role="option" id="cmdk-opt-${i}" data-i="${i}" aria-selected="${i === sel}">${icon(it.icon || 'ext')}${esc(it.label)}${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</li>`;
            })
            .join('') || '<li class="cmdk-empty">Sin resultados</li>';
        const cur = list.querySelector('[aria-selected="true"]');
        if (cur) cur.scrollIntoView({ block: 'nearest' });
        if (cur) input.setAttribute('aria-activedescendant', cur.id);
        else input.removeAttribute('aria-activedescendant');
      }
      function run(i) {
        const it = visible[i];
        if (!it) return;
        close();
        it.run();
      }
      input.addEventListener('input', () => {
        sel = 0;
        render();
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          sel = Math.min(visible.length - 1, sel + 1);
          render();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          sel = Math.max(0, sel - 1);
          render();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          run(sel);
        } else if (e.key === 'Escape') {
          close();
        }
      });
      list.addEventListener('click', (e) => {
        const li = e.target.closest('[data-i]');
        if (li) run(Number(li.dataset.i));
      });
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
      render();
      input.focus();
    }
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (overlay) close();
        else if (items.length && !document.querySelector('.dialog-overlay')) open();
      }
    });
    return { register, open, close };
  })();

  /* ---------- shell + hash router ---------- */
  function shell(opts) {
    const root = opts.root;
    const user = opts.user;
    const top = (user.roles || [])[0];
    const roleColor = DX.safeColor(top && top.color, '#a4f5c9');
    const groups = opts.groups
      .map((g) => ({ ...g, items: g.items.filter((it) => it.visible !== false) }))
      .filter((g) => g.items.length);
    root.innerHTML = `
      <div class="app-shell">
        <aside class="app-side" id="app-side">
          ${opts.brand}
          <button type="button" class="app-search-btn" data-cmdk>${icon('search')}Buscar…<kbd>Ctrl K</kbd></button>
          <nav class="app-nav" aria-label="Secciones">
            ${groups
              .map(
                (g) => `<div class="app-nav-group">${g.title ? `<h2>${esc(g.title)}</h2>` : ''}
                ${g.items.map((it) => `<a href="#${it.id}" data-route="${it.id}">${icon(it.icon)}<span>${esc(it.label)}</span><span class="count" data-count="${it.id}"></span></a>`).join('')}</div>`
              )
              .join('')}
          </nav>
          <div class="app-side-foot">
            <div class="app-user"><img src="${esc(user.avatar || DX.defaultAvatar)}" alt=""><div><b>${esc(user.username || user.id)}</b><small style="color:${roleColor}">${esc(top ? top.name : 'Miembro')}</small></div></div>
            ${(opts.footLinks || []).map((l) => `<a href="${esc(l.href)}">${icon(l.icon)}${esc(l.label)}</a>`).join('')}
            <button type="button" data-logout>${icon('logout')}Cerrar sesión</button>
          </div>
        </aside>
        <div class="app-scrim" data-side-close></div>
        <div class="app-main">
          <header class="app-top">
            <button type="button" class="icon-btn app-menu-btn" data-side-open aria-label="Abrir menú" aria-expanded="false" aria-controls="app-side">${icon('menu')}</button>
            <div class="app-crumbs"><span>${esc(opts.name)}</span><span>/</span><b id="app-crumb"></b></div>
            <div class="app-top-actions" id="app-top-actions"></div>
          </header>
          <main class="app-view" id="app-view" tabindex="-1"></main>
        </div>
      </div>`;

    const view = root.querySelector('#app-view');
    const crumb = root.querySelector('#app-crumb');
    const flat = groups.flatMap((g) => g.items);
    root.querySelector('[data-cmdk]').addEventListener('click', () => cmdk.open());
    const sideBtn = root.querySelector('[data-side-open]');
    const side = root.querySelector('#app-side');
    const setSide = (open) => {
      document.body.classList.toggle('side-open', open);
      sideBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        const first = side.querySelector('a, button');
        if (first) first.focus();
      }
    };
    sideBtn.addEventListener('click', () => setSide(true));
    root.querySelector('[data-side-close]').addEventListener('click', () => setSide(false));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('side-open')) {
        setSide(false);
        sideBtn.focus();
      }
    });
    root.querySelector('[data-logout]').addEventListener('click', async () => {
      try {
        await api('/api/auth/logout', { method: 'POST' });
      } catch (err) {}
      location.href = '/';
    });

    let current = null;
    let token = 0;
    async function route() {
      const [id, sub] = (location.hash || '').slice(1).split('/');
      const item = flat.find((it) => it.id === id) || flat[0];
      // one-shot actions (#anuncios/new) are consumed; real deep links
      // (#specs/muertes) stay in the URL so they can be shared and reloaded
      if (sub === 'new') history.replaceState(null, '', '#' + item.id);
      if (current === item.id && view.dataset.route === item.id) {
        if (sub && item.onSub) item.onSub(sub);
        return;
      }
      current = item.id;
      if (document.body.classList.contains('side-open')) setSide(false);
      root.querySelectorAll('[data-route]').forEach((a) => {
        if (a.dataset.route === item.id) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
      crumb.textContent = item.label;
      document.title = `${item.label} · ${opts.name} · Desafio Xtremo`;
      view.dataset.route = item.id;
      view.classList.remove('view-enter');
      void view.offsetWidth;
      view.classList.add('view-enter');
      const my = ++token;
      view.innerHTML = '<div class="skeleton" style="height:28px;width:240px;margin-bottom:22px"></div><div class="skeleton" style="height:200px"></div>';
      try {
        await item.render(view, () => my === token);
        if (sub && my === token && item.onSub) item.onSub(sub);
      } catch (err) {
        if (my === token) view.innerHTML = `<div class="banner banner-danger">${icon('close')}<div>${esc(err.message || 'Error al cargar esta sección.')}</div></div>`;
      }
      view.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
    window.addEventListener('hashchange', route);
    cmdk.register(
      flat
        .map((it) => ({ group: 'Ir a', label: it.label, icon: it.icon, run: () => (location.hash = it.id) }))
        .concat(opts.commands || [])
    );
    route();
    return {
      setCount(id, n) {
        const el = root.querySelector(`[data-count="${id}"]`);
        if (el) el.textContent = n == null ? '' : n;
      },
      rerender() {
        current = null;
        route();
      },
    };
  }

  /* ---------- markdown editor ---------- */
  function mdEditor(textarea, preview) {
    const render = () => {
      try {
        preview.innerHTML = window.marked && window.DOMPurify ? DOMPurify.sanitize(marked.parse(textarea.value || '')) : esc(textarea.value);
        DX.mdCallouts(preview);
      } catch (err) {
        preview.textContent = textarea.value;
      }
      if (!textarea.value.trim()) preview.innerHTML = '<p style="color:var(--text-dim)">La vista previa aparecerá aquí.</p>';
    };
    let t = null;
    textarea.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(render, 120);
    });
    const bar = textarea.parentElement.querySelector('.md-toolbar');
    if (bar) {
      bar.addEventListener('click', (e) => {
        const b = e.target.closest('[data-md]');
        if (!b) return;
        const [before, after] = b.dataset.md.split('|');
        const s = textarea.selectionStart;
        const en = textarea.selectionEnd;
        const sel = textarea.value.slice(s, en);
        textarea.setRangeText(before + sel + (after || ''), s, en, 'end');
        textarea.focus();
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
    render();
    return { render };
  }
  const MD_TOOLBAR = `<div class="md-toolbar">
      <button type="button" data-md="## |">H2</button><button type="button" data-md="### |">H3</button>
      <button type="button" data-md="**|**">B</button><button type="button" data-md="_|_">I</button>
      <button type="button" data-md="[|](https://)">Enlace</button><button type="button" data-md="- |">Lista</button>
      <button type="button" data-md="> [!TIP]\n> |">Consejo</button><button type="button" data-md="> [!WARNING]\n> |">Aviso</button>
      <button type="button" data-md="\n| Col | Col |\n|---|---|\n| | |\n|">Tabla</button>
    </div>`;

  /* ---------- line chart ---------- */
  function lineChart(el, rows, opts) {
    opts = opts || {};
    if (!rows || !rows.length) {
      el.innerHTML = '<div class="empty-state">Todavía no hay datos en este periodo.</div>';
      return;
    }
    const W = 800, H = 240, P = 8;
    const key = opts.key || 'views';
    const key2 = opts.key2;
    const max = Math.max(1, ...rows.map((r) => Number(r[key]) || 0), ...(key2 ? rows.map((r) => Number(r[key2]) || 0) : [0]));
    const step = rows.length > 1 ? (W - P * 2) / (rows.length - 1) : 0;
    const x0 = rows.length > 1 ? P : W / 2;
    const pt = (r, i, k) => [x0 + i * step, H - P - ((Number(r[k]) || 0) / max) * (H - P * 2)];
    const pts = rows.map((r, i) => pt(r, i, key));
    const line = (ps) => ps.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const area = `${line(pts)} L${pts[pts.length - 1][0].toFixed(1)},${H - P} L${pts[0][0].toFixed(1)},${H - P} Z`;
    const grid = [0.25, 0.5, 0.75].map((f) => `<line class="gridline" x1="0" x2="${W}" y1="${(H - P - f * (H - P * 2)).toFixed(1)}" y2="${(H - P - f * (H - P * 2)).toFixed(1)}"/>`).join('');
    const every = Math.max(1, Math.ceil(rows.length / 7));
    const labels = rows.map((r, i) => (i % every === 0 || i === rows.length - 1 ? opts.label(r) : ''));
    el.innerHTML = `
      <div class="chart">
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(opts.aria || 'Gráfico')}">
          <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".28"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
          ${grid}
          <path class="area" d="${area}"/>
          ${key2 ? `<path class="line-2" d="${line(rows.map((r, i) => pt(r, i, key2)))}"/>` : ''}
          <path class="line" d="${line(pts)}"/>
          ${pts.length === 1 ? `<circle class="dot" cx="${pts[0][0]}" cy="${pts[0][1]}" r="5"/>` : ''}
          <line class="hover-line" x1="0" x2="0" y1="0" y2="${H}" visibility="hidden"/>
          <circle class="dot" r="5" visibility="hidden"/>
        </svg>
        <div class="chart-tip" hidden></div>
      </div>
      <div class="chart-labels">${labels.map((l) => `<span>${esc(l)}</span>`).join('')}</div>
      ${opts.legend ? `<div class="legend">${opts.legend}</div>` : ''}`;
    const svg = el.querySelector('svg');
    const tip = el.querySelector('.chart-tip');
    const hl = svg.querySelector('.hover-line');
    const dot = svg.querySelector('.dot');
    svg.addEventListener('pointermove', (e) => {
      const r = svg.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(rows.length - 1, Math.round(step ? (x - P) / step : 0)));
      const [px, py] = pts[i];
      hl.setAttribute('x1', px);
      hl.setAttribute('x2', px);
      hl.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', px);
      dot.setAttribute('cy', py);
      dot.setAttribute('visibility', 'visible');
      tip.hidden = false;
      tip.style.left = (px / W) * 100 + '%';
      tip.style.top = (py / H) * r.height + 'px';
      tip.innerHTML = opts.tip(rows[i]);
    });
    svg.addEventListener('pointerleave', () => {
      tip.hidden = true;
      hl.setAttribute('visibility', 'hidden');
      dot.setAttribute('visibility', 'hidden');
    });
  }

  /* ---------- auth gate ---------- */
  function denied(root, title, message, login, loginReturn) {
    root.innerHTML = `
      <div class="app-splash"><div class="app-denied">
        <div class="app-splash-mark"></div>
        <h1>${esc(title)}</h1>
        <p>${esc(message)}</p>
        ${login ? `<a class="btn btn-discord" href="/api/auth/login?return_to=${encodeURIComponent(loginReturn)}">Iniciar sesión con Discord</a>` : '<a class="btn btn-ghost" href="/">Volver al sitio</a>'}
      </div></div>`;
  }

  window.DXApp = { api, drawer, cmdk, shell, mdEditor, MD_TOOLBAR, lineChart, icon, denied, esc, trapFocus };
})();
