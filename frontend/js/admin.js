/* Dark, in-page replacement for window.confirm() — the native dialog is an
 * unstyled OS-chrome white box that also freezes the tab for any outside
 * automation, unlike this one. */
(function () {
  const overlay = document.getElementById('zd-confirm-overlay');
  if (!overlay) return;
  const messageEl = document.getElementById('zd-confirm-message');
  const okBtn = document.getElementById('zd-confirm-ok');
  const cancelBtn = document.getElementById('zd-confirm-cancel');
  let pendingResolve = null;

  function close(result) {
    overlay.hidden = true;
    if (pendingResolve) {
      const resolve = pendingResolve;
      pendingResolve = null;
      resolve(result);
    }
  }

  okBtn.addEventListener('click', () => close(true));
  cancelBtn.addEventListener('click', () => close(false));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) close(false);
  });

  window.zdConfirm = function (message) {
    messageEl.textContent = message;
    overlay.hidden = false;
    return new Promise((resolve) => {
      pendingResolve = resolve;
    });
  };
})();

(function () {
  const root = document.getElementById('panel-root');
  let csrfToken = '';
  let me = null;
  let permissionRegistry = [];
  let editingRoleId = null;

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function denied(message, showLogin) {
    root.innerHTML = `
      <div class="panel-denied">
        <h1>Panel de Desafio Xtremo</h1>
        <p>${escapeHtml(message)}</p>
        ${showLogin ? `<a class="btn btn-discord" href="/api/auth/login?return_to=/admin.html">Iniciar sesión con Discord</a>` : `<a class="btn btn-ghost" href="index.html">Volver al sitio</a>`}
      </div>`;
  }

  async function api(path, options = {}) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (options.method && options.method !== 'GET') headers['X-CSRF-Token'] = csrfToken;
    const res = await fetch(path, { credentials: 'include', ...options, headers });
    const isJson = res.headers.get('content-type')?.includes('application/json');
    const body = isJson ? await res.json().catch(() => null) : null;
    if (!res.ok) {
      const err = new Error((body && body.error) || `Error ${res.status}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  }

  function hasPerm(key) {
    return !!(me && me.permissions && me.permissions.includes(key));
  }

  function initShell() {
    const tpl = document.getElementById('tpl-panel');
    root.innerHTML = '';
    root.appendChild(tpl.content.cloneNode(true));

    document.getElementById('panel-user-avatar').src =
      me.avatar ||
      'data:image/svg+xml;utf8,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="12" fill="#172038"/><circle cx="12" cy="9.5" r="3.5" fill="#54607f"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" fill="#54607f"/></svg>'
        );
    document.getElementById('panel-user-name').textContent = me.username || me.id;

    const overviewRoles = document.getElementById('overview-roles');
    overviewRoles.innerHTML = (me.roles || [])
      .map(
        (r) =>
          `<span class="perm-chip" style="border-color:${r.color}55;color:${r.color}"><span class="role-swatch" style="display:inline-block;background:${r.color};width:7px;height:7px;border-radius:50%;margin-right:6px;"></span>${escapeHtml(r.name)}</span>`
      )
      .join('') || '<span class="panel-section-sub">Sin rangos asignados.</span>';

    if (hasPerm('panel.access')) document.getElementById('nav-roles').hidden = false;
    if (hasPerm('panel.view_usage')) document.getElementById('nav-usage').hidden = false;
    if (hasPerm('panel.access')) document.getElementById('nav-wiki').hidden = false;
    if (hasPerm('panel.access')) document.getElementById('nav-announcements').hidden = false;
    if (hasPerm('panel.access')) document.getElementById('nav-team').hidden = false;
    if (hasPerm('sanctions.access')) document.getElementById('nav-sanctions').hidden = false;

    document.querySelectorAll('.panel-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.panel-nav-btn').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.panel-section').forEach((s) => s.classList.remove('active'));
        btn.classList.add('active');
        const section = document.getElementById('section-' + btn.dataset.section);
        section.classList.add('active');
        if (btn.dataset.section === 'roles') loadRoles();
        if (btn.dataset.section === 'usage') loadUsage();
        if (btn.dataset.section === 'wiki') loadWiki();
        if (btn.dataset.section === 'announcements') loadAnnouncements();
        if (btn.dataset.section === 'team') loadTeam();
        if (btn.dataset.section === 'sanctions') loadSanctions();
      });
    });

    wireRoleForm();
    wireUserSearch();
    wireWikiForm();
    wireAnnouncementForm();
    wireTeamForm();
    wireSanctionForm();
  }

  function renderMarkdownPreview(el, content) {
    if (!el) return;
    try {
      const raw = typeof marked !== 'undefined' ? marked.parse(content || '') : escapeHtml(content || '');
      el.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(raw) : escapeHtml(content || '');
    } catch (err) {
      el.textContent = content || '';
    }
  }

  /* ---------- Roles & permissions ---------- */

  function roleMsg(text, type) {
    const el = document.getElementById('roles-msg');
    el.innerHTML = text ? `<div class="panel-msg ${type}">${escapeHtml(text)}</div>` : '';
  }

  async function loadRoles() {
    try {
      const [{ roles }, permRes] = await Promise.all([
        api('/api/admin/roles'),
        permissionRegistry.length ? Promise.resolve({ permissions: permissionRegistry }) : api('/api/admin/permissions'),
      ]);
      permissionRegistry = permRes.permissions;
      renderRoles(roles);
    } catch (err) {
      roleMsg(err.message, 'error');
    }
  }

  function renderRoles(roles) {
    const grid = document.getElementById('roles-grid');
    const canManage = hasPerm('panel.manage_roles');
    grid.innerHTML = roles
      .map((r) => {
        const perms = r.permissions.length
          ? r.permissions.map((k) => `<span class="perm-chip">${escapeHtml(k)}</span>`).join('')
          : '<span class="perm-chip">sin permisos</span>';
        const actions =
          canManage && !r.is_locked
            ? `<div class="role-card-actions">
                 <button class="btn btn-ghost btn-sm" data-edit="${r.id}">Editar</button>
                 <button class="btn btn-ghost btn-sm" data-delete="${r.id}">Eliminar</button>
               </div>`
            : '';
        return `
          <div class="role-card">
            <div class="role-card-head">
              <span class="role-swatch" style="background:${r.color}"></span>
              <span class="role-card-name">${escapeHtml(r.name)}</span>
              ${r.is_locked ? '<span class="role-locked-badge">Fijo</span>' : ''}
            </div>
            <div class="role-perms">${perms}</div>
            ${actions}
          </div>`;
      })
      .join('');

    grid.querySelectorAll('[data-edit]').forEach((btn) =>
      btn.addEventListener('click', () => openRoleForm(roles.find((r) => r.id === Number(btn.dataset.edit))))
    );
    grid.querySelectorAll('[data-delete]').forEach((btn) =>
      btn.addEventListener('click', () => deleteRole(Number(btn.dataset.delete)))
    );

    document.getElementById('role-form-open').style.display = canManage ? '' : 'none';
  }

  function wireRoleForm() {
    document.getElementById('role-form-open').addEventListener('click', () => openRoleForm(null));
    document.getElementById('role-form-cancel').addEventListener('click', closeRoleForm);
    document.getElementById('role-form-color').addEventListener('input', (e) => {
      document.getElementById('role-form-color-hex').textContent = e.target.value;
    });
    document.getElementById('role-form-save').addEventListener('click', saveRole);
  }

  function openRoleForm(role) {
    editingRoleId = role ? role.id : null;
    document.getElementById('role-form-title').textContent = role ? `Editar ${role.name}` : 'Crear rango';
    document.getElementById('role-form-name').value = role ? role.name : '';
    document.getElementById('role-form-color').value = role ? role.color : '#6fb3ff';
    document.getElementById('role-form-color-hex').textContent = role ? role.color : '#6fb3ff';
    document.getElementById('role-form-position').value = role ? role.position : 0;

    const permsWrap = document.getElementById('role-form-perms');
    const activeKeys = role ? role.permissions : [];
    permsWrap.innerHTML = permissionRegistry
      .map(
        (p) => `
        <label class="perm-check">
          <input type="checkbox" value="${escapeHtml(p.key)}" ${activeKeys.includes(p.key) ? 'checked' : ''}>
          <span><span class="perm-label">${escapeHtml(p.label)}</span><span class="perm-desc">${escapeHtml(p.description || '')}</span></span>
        </label>`
      )
      .join('');

    document.getElementById('role-form-card').hidden = false;
  }

  function closeRoleForm() {
    document.getElementById('role-form-card').hidden = true;
    editingRoleId = null;
  }

  async function saveRole() {
    const name = document.getElementById('role-form-name').value.trim();
    const color = document.getElementById('role-form-color').value;
    const position = Number(document.getElementById('role-form-position').value) || 0;
    const permissionKeys = Array.from(
      document.querySelectorAll('#role-form-perms input[type="checkbox"]:checked')
    ).map((el) => el.value);

    try {
      if (editingRoleId) {
        await api(`/api/admin/roles/${editingRoleId}`, {
          method: 'PATCH',
          body: JSON.stringify({ name, color, position, permissionKeys }),
        });
        roleMsg('Rango actualizado.', 'ok');
      } else {
        await api('/api/admin/roles', {
          method: 'POST',
          body: JSON.stringify({ name, color, position, permissionKeys }),
        });
        roleMsg('Rango creado.', 'ok');
      }
      closeRoleForm();
      loadRoles();
    } catch (err) {
      roleMsg(err.message, 'error');
    }
  }

  async function deleteRole(id) {
    const ok = window.zdConfirm ? await window.zdConfirm('¿Eliminar este rango? Esta acción no se puede deshacer.') : confirm('¿Eliminar este rango?');
    if (!ok) return;
    try {
      await api(`/api/admin/roles/${id}`, { method: 'DELETE' });
      roleMsg('Rango eliminado.', 'ok');
      loadRoles();
    } catch (err) {
      roleMsg(err.message, 'error');
    }
  }

  /* ---------- User role assignment ---------- */

  function wireUserSearch() {
    document.getElementById('user-search-btn').addEventListener('click', searchUsers);
    document.getElementById('user-search-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') searchUsers();
    });
  }

  const DISCORD_ID_RE = /^\d{15,25}$/;

  async function searchUsers() {
    const q = document.getElementById('user-search-input').value.trim();
    const wrap = document.getElementById('user-results');
    wrap.innerHTML = '<span class="panel-section-sub">Buscando…</span>';
    try {
      const { users } = await api(`/api/admin/users?q=${encodeURIComponent(q)}`);
      const [{ roles: allRoles }] = await Promise.all([api('/api/admin/roles')]);
      renderUserResults(users, allRoles, q);
    } catch (err) {
      wrap.innerHTML = `<div class="panel-msg error">${escapeHtml(err.message)}</div>`;
    }
  }

  function renderUserResults(users, allRoles, q) {
    const wrap = document.getElementById('user-results');
    const canManage = hasPerm('panel.manage_roles');

    // A search by a not-yet-seen Discord ID returns nothing from `users`,
    // but you can still assign it a role — synthesize a stub row so there's
    // actually a control to do that, instead of just saying it's possible.
    if (!users.length && DISCORD_ID_RE.test(q)) {
      users = [{ id: q, username: null, avatar: null, roles: [] }];
    }

    if (!users.length) {
      wrap.innerHTML = '<span class="panel-section-sub">Sin resultados. Prueba con el ID de Discord completo para asignarle un rango a alguien que todavía no ha iniciado sesión.</span>';
    } else {
      wrap.innerHTML = users.map((u) => renderUserRow(u, allRoles, canManage)).join('');
    }

    wrap.querySelectorAll('[data-remove-role]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const [userId, roleId] = btn.dataset.removeRole.split(':');
        try {
          await api(`/api/admin/users/${userId}/roles/${roleId}`, { method: 'DELETE' });
          searchUsers();
        } catch (err) {
          alert(err.message);
        }
      })
    );
    wrap.querySelectorAll('[data-assign-user]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.assignUser;
        const select = wrap.querySelector(`select[data-assign-select="${userId}"]`);
        const roleId = Number(select.value);
        if (!roleId) return;
        try {
          await api(`/api/admin/users/${userId}/roles`, { method: 'POST', body: JSON.stringify({ roleId }) });
          searchUsers();
        } catch (err) {
          alert(err.message);
        }
      })
    );
  }

  function renderUserRow(u, allRoles, canManage) {
    const avatar =
      u.avatar ||
      'data:image/svg+xml;utf8,' +
        encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="12" fill="#172038"/><circle cx="12" cy="9.5" r="3.5" fill="#54607f"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" fill="#54607f"/></svg>');
    const roles = (u.roles || [])
      .map(
        (r) => `
        <span class="role-pill" style="border-color:${r.color}55;color:${r.color}">
          <span class="role-swatch" style="background:${r.color}"></span>${escapeHtml(r.name)}
          ${canManage ? `<button data-remove-role="${u.id}:${r.id}" title="Quitar">×</button>` : ''}
        </span>`
      )
      .join('');
    const options = allRoles.map((r) => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');

    return `
      <div class="user-result">
        <img src="${avatar}" alt="">
        <span class="user-result-name">${escapeHtml(u.username || '(sin nombre aún)')}</span>
        <span class="user-result-id">${escapeHtml(u.id)}</span>
        <div class="user-result-roles">${roles}</div>
      </div>
      ${
        canManage
          ? `<div class="user-assign-row">
               <select data-assign-select="${u.id}"><option value="">Asignar rango…</option>${options}</select>
               <button class="btn btn-ghost btn-sm" data-assign-user="${u.id}">Asignar</button>
             </div>`
          : ''
      }`;
  }

  /* ---------- Usage monitor ---------- */

  const RESOURCE_LABELS = {
    d1_reads: 'D1 · filas leídas hoy',
    d1_writes: 'D1 · filas escritas hoy',
    kv_reads: 'KV · lecturas hoy',
    kv_writes: 'KV · escrituras hoy',
    kv_deletes: 'KV · borrados hoy',
  };

  async function loadUsage() {
    const grid = document.getElementById('usage-grid');
    grid.innerHTML = '<span class="panel-section-sub">Cargando…</span>';
    try {
      const { usage } = await api('/api/admin/usage');
      grid.innerHTML = Object.entries(usage)
        .map(([key, { current, limit }]) => {
          const pct = limit ? Math.min(100, (current / limit) * 100) : 0;
          const blocked = current >= limit - 1;
          const cls = blocked || pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : '';
          return `
            <div class="usage-card">
              <div class="usage-card-head">
                <span class="usage-card-title">${RESOURCE_LABELS[key] || key}</span>
                ${blocked ? '<span class="usage-blocked">BLOQUEADO</span>' : ''}
              </div>
              <div class="usage-bar"><div class="usage-bar-fill ${cls}" style="width:${pct}%"></div></div>
              <div class="usage-card-nums">${current.toLocaleString('es')} / ${limit.toLocaleString('es')} (${pct.toFixed(1)}%)</div>
            </div>`;
        })
        .join('');
    } catch (err) {
      grid.innerHTML = `<div class="panel-msg error">${escapeHtml(err.message)}</div>`;
    }
  }

  /* ---------- Wiki ---------- */

  let editingWikiId = null;

  function wikiMsg(text, type) {
    const el = document.getElementById('wiki-msg');
    el.innerHTML = text ? `<div class="panel-msg ${type}">${escapeHtml(text)}</div>` : '';
  }

  async function loadWiki() {
    const grid = document.getElementById('wiki-grid');
    grid.innerHTML = '<span class="panel-section-sub">Cargando…</span>';
    try {
      const { pages } = await api('/api/admin/wiki');
      renderWiki(pages || []);
    } catch (err) {
      grid.innerHTML = '';
      wikiMsg(err.message, 'error');
    }
  }

  function renderWiki(pages) {
    const grid = document.getElementById('wiki-grid');
    const canManage = hasPerm('wiki.manage');
    document.getElementById('wiki-form-open').style.display = canManage ? '' : 'none';

    if (!pages.length) {
      grid.innerHTML = '<span class="panel-section-sub">Todavía no hay páginas.</span>';
      return;
    }

    const byCategory = new Map();
    pages
      .slice()
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .forEach((p) => {
        const cat = p.category || 'Sin categoría';
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat).push(p);
      });

    grid.innerHTML = Array.from(byCategory.entries())
      .map(
        ([cat, list]) => `
        <div class="wiki-category-block">
          <h3 class="wiki-category-title">${escapeHtml(cat)}</h3>
          <div class="role-grid">
            ${list
              .map(
                (p) => `
              <div class="role-card">
                <div class="role-card-head">
                  <span class="role-card-name">${escapeHtml(p.title)}</span>
                  <span class="role-locked-badge">${escapeHtml(p.slug)}</span>
                </div>
                ${
                  canManage
                    ? `<div class="role-card-actions">
                         <button class="btn btn-ghost btn-sm" data-edit="${p.id}">Editar</button>
                         <button class="btn btn-ghost btn-sm" data-delete="${p.id}">Eliminar</button>
                       </div>`
                    : ''
                }
              </div>`
              )
              .join('')}
          </div>
        </div>`
      )
      .join('');

    grid.querySelectorAll('[data-edit]').forEach((btn) =>
      btn.addEventListener('click', () => openWikiForm(pages.find((p) => p.id === Number(btn.dataset.edit))))
    );
    grid.querySelectorAll('[data-delete]').forEach((btn) =>
      btn.addEventListener('click', () => deleteWiki(Number(btn.dataset.delete)))
    );
  }

  function wireWikiForm() {
    document.getElementById('wiki-form-open').addEventListener('click', () => openWikiForm(null));
    document.getElementById('wiki-form-cancel').addEventListener('click', closeWikiForm);
    document.getElementById('wiki-form-save').addEventListener('click', saveWiki);
    document.getElementById('wiki-form-content').addEventListener('input', (e) => {
      renderMarkdownPreview(document.getElementById('wiki-form-preview'), e.target.value);
    });
  }

  function openWikiForm(page) {
    editingWikiId = page ? page.id : null;
    document.getElementById('wiki-form-heading').textContent = page ? `Editar ${page.title}` : 'Crear página';
    document.getElementById('wiki-form-slug').value = page ? page.slug : '';
    document.getElementById('wiki-form-title').value = page ? page.title : '';
    document.getElementById('wiki-form-category').value = page ? page.category || '' : '';
    document.getElementById('wiki-form-position').value = page ? page.position : 0;
    document.getElementById('wiki-form-content').value = page ? page.content || '' : '';
    renderMarkdownPreview(document.getElementById('wiki-form-preview'), page ? page.content : '');
    document.getElementById('wiki-form-card').hidden = false;
  }

  function closeWikiForm() {
    document.getElementById('wiki-form-card').hidden = true;
    editingWikiId = null;
  }

  async function saveWiki() {
    const slug = document.getElementById('wiki-form-slug').value.trim();
    const title = document.getElementById('wiki-form-title').value.trim();
    const category = document.getElementById('wiki-form-category').value.trim();
    const position = Number(document.getElementById('wiki-form-position').value) || 0;
    const content = document.getElementById('wiki-form-content').value;

    try {
      if (editingWikiId) {
        await api(`/api/admin/wiki/${editingWikiId}`, {
          method: 'PATCH',
          body: JSON.stringify({ slug, title, category, content, position }),
        });
        wikiMsg('Página actualizada.', 'ok');
      } else {
        await api('/api/admin/wiki', {
          method: 'POST',
          body: JSON.stringify({ slug, title, category, content, position }),
        });
        wikiMsg('Página creada.', 'ok');
      }
      closeWikiForm();
      loadWiki();
    } catch (err) {
      wikiMsg(err.message, 'error');
    }
  }

  async function deleteWiki(id) {
    const ok = window.zdConfirm
      ? await window.zdConfirm('¿Eliminar esta página? Esta acción no se puede deshacer.')
      : confirm('¿Eliminar esta página?');
    if (!ok) return;
    try {
      await api(`/api/admin/wiki/${id}`, { method: 'DELETE' });
      wikiMsg('Página eliminada.', 'ok');
      loadWiki();
    } catch (err) {
      wikiMsg(err.message, 'error');
    }
  }

  /* ---------- Announcements ---------- */

  let editingAnnId = null;

  function annMsg(text, type) {
    const el = document.getElementById('ann-msg');
    el.innerHTML = text ? `<div class="panel-msg ${type}">${escapeHtml(text)}</div>` : '';
  }

  async function loadAnnouncements() {
    const grid = document.getElementById('ann-grid');
    grid.innerHTML = '<span class="panel-section-sub">Cargando…</span>';
    try {
      const { announcements } = await api('/api/admin/announcements');
      renderAnnouncements(announcements || []);
    } catch (err) {
      grid.innerHTML = '';
      annMsg(err.message, 'error');
    }
  }

  function renderAnnouncements(list) {
    const grid = document.getElementById('ann-grid');
    const canManage = hasPerm('announcements.manage');
    document.getElementById('ann-form-open').style.display = canManage ? '' : 'none';

    if (!list.length) {
      grid.innerHTML = '<span class="panel-section-sub">Todavía no hay anuncios.</span>';
      return;
    }

    const sorted = list.slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    grid.innerHTML = sorted
      .map(
        (a) => `
        <div class="role-card">
          <div class="role-card-head">
            <span class="role-card-name">${escapeHtml(a.title)}</span>
            ${a.pinned ? '<span class="pin-badge">Fijado</span>' : ''}
          </div>
          <div class="panel-section-sub" style="margin:0;">${escapeHtml(a.created_at ? new Date(a.created_at).toLocaleString('es') : '')}</div>
          ${
            canManage
              ? `<div class="role-card-actions">
                   <button class="btn btn-ghost btn-sm" data-edit="${a.id}">Editar</button>
                   <button class="btn btn-ghost btn-sm" data-delete="${a.id}">Eliminar</button>
                 </div>`
              : ''
          }
        </div>`
      )
      .join('');

    grid.querySelectorAll('[data-edit]').forEach((btn) =>
      btn.addEventListener('click', () => openAnnouncementForm(list.find((a) => a.id === Number(btn.dataset.edit))))
    );
    grid.querySelectorAll('[data-delete]').forEach((btn) =>
      btn.addEventListener('click', () => deleteAnnouncement(Number(btn.dataset.delete)))
    );
  }

  function wireAnnouncementForm() {
    document.getElementById('ann-form-open').addEventListener('click', () => openAnnouncementForm(null));
    document.getElementById('ann-form-cancel').addEventListener('click', closeAnnouncementForm);
    document.getElementById('ann-form-save').addEventListener('click', saveAnnouncement);
    document.getElementById('ann-form-body').addEventListener('input', (e) => {
      renderMarkdownPreview(document.getElementById('ann-form-preview'), e.target.value);
    });
  }

  function openAnnouncementForm(a) {
    editingAnnId = a ? a.id : null;
    document.getElementById('ann-form-heading').textContent = a ? `Editar ${a.title}` : 'Crear anuncio';
    document.getElementById('ann-form-title').value = a ? a.title : '';
    document.getElementById('ann-form-pinned').checked = a ? !!a.pinned : false;
    document.getElementById('ann-form-body').value = a ? a.body || '' : '';
    renderMarkdownPreview(document.getElementById('ann-form-preview'), a ? a.body : '');
    document.getElementById('ann-form-card').hidden = false;
  }

  function closeAnnouncementForm() {
    document.getElementById('ann-form-card').hidden = true;
    editingAnnId = null;
  }

  async function saveAnnouncement() {
    const title = document.getElementById('ann-form-title').value.trim();
    const pinned = document.getElementById('ann-form-pinned').checked;
    const body = document.getElementById('ann-form-body').value;

    try {
      if (editingAnnId) {
        await api(`/api/admin/announcements/${editingAnnId}`, {
          method: 'PATCH',
          body: JSON.stringify({ title, body, pinned }),
        });
        annMsg('Anuncio actualizado.', 'ok');
      } else {
        await api('/api/admin/announcements', {
          method: 'POST',
          body: JSON.stringify({ title, body, pinned }),
        });
        annMsg('Anuncio creado.', 'ok');
      }
      closeAnnouncementForm();
      loadAnnouncements();
    } catch (err) {
      annMsg(err.message, 'error');
    }
  }

  async function deleteAnnouncement(id) {
    const ok = window.zdConfirm
      ? await window.zdConfirm('¿Eliminar este anuncio? Esta acción no se puede deshacer.')
      : confirm('¿Eliminar este anuncio?');
    if (!ok) return;
    try {
      await api(`/api/admin/announcements/${id}`, { method: 'DELETE' });
      annMsg('Anuncio eliminado.', 'ok');
      loadAnnouncements();
    } catch (err) {
      annMsg(err.message, 'error');
    }
  }

  /* ---------- Team ---------- */

  let editingTeamId = null;
  const TEAM_LABELS = { staff: 'Staff', dev: 'Desarrollo' };

  function teamMsg(text, type) {
    const el = document.getElementById('team-msg');
    el.innerHTML = text ? `<div class="panel-msg ${type}">${escapeHtml(text)}</div>` : '';
  }

  async function loadTeam() {
    const grid = document.getElementById('team-grid');
    grid.innerHTML = '<span class="panel-section-sub">Cargando…</span>';
    try {
      const { members } = await api('/api/admin/team');
      renderTeam(members || []);
    } catch (err) {
      grid.innerHTML = '';
      teamMsg(err.message, 'error');
    }
  }

  function renderTeam(members) {
    const grid = document.getElementById('team-grid');
    const canManage = hasPerm('team.manage');
    document.getElementById('team-form-open').style.display = canManage ? '' : 'none';

    if (!members.length) {
      grid.innerHTML = '<span class="panel-section-sub">Todavía no hay miembros.</span>';
      return;
    }

    grid.innerHTML = members
      .slice()
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((m) => {
        const nick = m.mc_nick || '';
        const color = m.rank_color || '#6fb3ff';
        return `
        <div class="role-card">
          <div class="role-card-head">
            <img class="team-skin-thumb" src="https://mc-heads.net/avatar/${encodeURIComponent(nick)}/32" alt="">
            <span class="role-card-name">${escapeHtml(nick)}</span>
            <span class="role-locked-badge">${escapeHtml(TEAM_LABELS[m.team] || m.team || '')}</span>
          </div>
          <div class="role-perms">
            <span class="perm-chip" style="border-color:${escapeHtml(color)}55;color:${escapeHtml(color)}">${escapeHtml(m.rank_label || '')}</span>
          </div>
          <div class="panel-section-sub" style="margin:0;">${escapeHtml(m.function_text || '')}</div>
          ${
            canManage
              ? `<div class="role-card-actions">
                   <button class="btn btn-ghost btn-sm" data-edit="${m.id}">Editar</button>
                   <button class="btn btn-ghost btn-sm" data-delete="${m.id}">Eliminar</button>
                 </div>`
              : ''
          }
        </div>`;
      })
      .join('');

    grid.querySelectorAll('[data-edit]').forEach((btn) =>
      btn.addEventListener('click', () => openTeamForm(members.find((m) => m.id === Number(btn.dataset.edit))))
    );
    grid.querySelectorAll('[data-delete]').forEach((btn) =>
      btn.addEventListener('click', () => deleteTeamMember(Number(btn.dataset.delete)))
    );
  }

  function wireTeamForm() {
    document.getElementById('team-form-open').addEventListener('click', () => openTeamForm(null));
    document.getElementById('team-form-cancel').addEventListener('click', closeTeamForm);
    document.getElementById('team-form-save').addEventListener('click', saveTeamMember);
    document.getElementById('team-form-color').addEventListener('input', (e) => {
      document.getElementById('team-form-color-hex').textContent = e.target.value;
    });
    document.getElementById('team-form-nick').addEventListener('input', (e) => {
      const img = document.getElementById('team-form-skin');
      const nick = e.target.value.trim();
      if (nick) {
        img.src = `https://mc-heads.net/avatar/${encodeURIComponent(nick)}/64`;
        img.hidden = false;
      } else {
        img.hidden = true;
      }
    });
  }

  function openTeamForm(member) {
    editingTeamId = member ? member.id : null;
    document.getElementById('team-form-heading').textContent = member ? `Editar ${member.mc_nick}` : 'Añadir miembro';
    document.getElementById('team-form-nick').value = member ? member.mc_nick : '';
    document.getElementById('team-form-rank').value = member ? member.rank_label || '' : '';
    document.getElementById('team-form-color').value = member ? member.rank_color || '#6fb3ff' : '#6fb3ff';
    document.getElementById('team-form-color-hex').textContent = member ? member.rank_color || '#6fb3ff' : '#6fb3ff';
    document.getElementById('team-form-function').value = member ? member.function_text || '' : '';
    document.getElementById('team-form-team').value = member ? member.team || 'staff' : 'staff';
    document.getElementById('team-form-position').value = member ? member.position : 0;

    const img = document.getElementById('team-form-skin');
    if (member && member.mc_nick) {
      img.src = `https://mc-heads.net/avatar/${encodeURIComponent(member.mc_nick)}/64`;
      img.hidden = false;
    } else {
      img.hidden = true;
    }

    document.getElementById('team-form-card').hidden = false;
  }

  function closeTeamForm() {
    document.getElementById('team-form-card').hidden = true;
    editingTeamId = null;
  }

  async function saveTeamMember() {
    const mc_nick = document.getElementById('team-form-nick').value.trim();
    const rank_label = document.getElementById('team-form-rank').value.trim();
    const rank_color = document.getElementById('team-form-color').value;
    const function_text = document.getElementById('team-form-function').value.trim();
    const team = document.getElementById('team-form-team').value;
    const position = Number(document.getElementById('team-form-position').value) || 0;

    try {
      if (editingTeamId) {
        await api(`/api/admin/team/${editingTeamId}`, {
          method: 'PATCH',
          body: JSON.stringify({ mc_nick, rank_label, rank_color, function_text, team, position }),
        });
        teamMsg('Miembro actualizado.', 'ok');
      } else {
        await api('/api/admin/team', {
          method: 'POST',
          body: JSON.stringify({ mc_nick, rank_label, rank_color, function_text, team, position }),
        });
        teamMsg('Miembro añadido.', 'ok');
      }
      closeTeamForm();
      loadTeam();
    } catch (err) {
      teamMsg(err.message, 'error');
    }
  }

  async function deleteTeamMember(id) {
    const ok = window.zdConfirm
      ? await window.zdConfirm('¿Eliminar este miembro del equipo? Esta acción no se puede deshacer.')
      : confirm('¿Eliminar este miembro?');
    if (!ok) return;
    try {
      await api(`/api/admin/team/${id}`, { method: 'DELETE' });
      teamMsg('Miembro eliminado.', 'ok');
      loadTeam();
    } catch (err) {
      teamMsg(err.message, 'error');
    }
  }

  /* ---------- Sanctions ---------- */

  const SANCTION_TYPE_LABELS = { ban: 'Ban', mute: 'Mute', kick: 'Kick', warn: 'Warn', other: 'Otro' };

  function sanctionsMsg(text, type) {
    const el = document.getElementById('sanctions-msg');
    el.innerHTML = text ? `<div class="panel-msg ${type}">${escapeHtml(text)}</div>` : '';
  }

  function sanctionFormMsg(text, type) {
    const el = document.getElementById('sanction-form-msg');
    el.innerHTML = text ? `<div class="panel-msg ${type}">${escapeHtml(text)}</div>` : '';
  }

  async function loadSanctions() {
    const list = document.getElementById('sanctions-list');
    list.innerHTML = '<span class="panel-section-sub">Cargando…</span>';
    try {
      const data = await api('/api/staff/sanctions');
      renderSanctions(data.sanctions || []);
    } catch (err) {
      list.innerHTML = '';
      sanctionsMsg(err.message, 'error');
    }
  }

  function evidenceMarkup(ev) {
    const url = `/api/staff/evidence/${ev.id}`;
    const type = ev.content_type || '';
    const label = ev.filename ? escapeHtml(ev.filename) : 'evidencia';
    if (type.startsWith('image/')) {
      return `<a href="${url}" target="_blank" class="evidence-thumb"><img src="${url}" alt="${label}" loading="lazy"></a>`;
    }
    if (type.startsWith('video/')) {
      return `<video class="evidence-thumb" controls src="${url}"></video>`;
    }
    return `<a href="${url}" target="_blank" class="evidence-file-link">Ver archivo${ev.filename ? ': ' + label : ''}</a>`;
  }

  function renderSanctions(sanctions) {
    const list = document.getElementById('sanctions-list');
    const canManage = hasPerm('sanctions.manage');

    if (!sanctions.length) {
      list.innerHTML = '<span class="panel-section-sub">Todavía no hay sanciones registradas.</span>';
      return;
    }

    list.innerHTML = sanctions
      .map((s) => {
        const evidence = Array.isArray(s.evidence) ? s.evidence : [];
        return `
        <div class="sanction-card">
          <div class="sanction-card-head">
            <span class="sanction-nick">${escapeHtml(s.target_nick)}</span>
            <span class="sanction-type">${escapeHtml(SANCTION_TYPE_LABELS[s.type] || s.type)}</span>
            ${canManage ? `<button class="btn btn-ghost btn-sm sanction-delete" data-delete="${s.id}">Eliminar</button>` : ''}
          </div>
          <p class="sanction-reason">${escapeHtml(s.reason || '')}</p>
          <div class="panel-section-sub" style="margin:0 0 10px;">
            Aplicada por ${escapeHtml(s.staff_name || s.staff_id || 'desconocido')}${s.created_at ? ' · ' + escapeHtml(new Date(s.created_at).toLocaleString('es')) : ''}
          </div>
          ${evidence.length ? `<div class="evidence-grid">${evidence.map(evidenceMarkup).join('')}</div>` : ''}
        </div>`;
      })
      .join('');

    list.querySelectorAll('[data-delete]').forEach((btn) =>
      btn.addEventListener('click', () => deleteSanction(Number(btn.dataset.delete)))
    );
  }

  async function deleteSanction(id) {
    const ok = window.zdConfirm
      ? await window.zdConfirm('¿Eliminar esta sanción? Esta acción no se puede deshacer.')
      : confirm('¿Eliminar esta sanción?');
    if (!ok) return;
    try {
      await api(`/api/staff/sanctions/${id}`, { method: 'DELETE' });
      sanctionsMsg('Sanción eliminada.', 'ok');
      loadSanctions();
    } catch (err) {
      sanctionsMsg(err.message, 'error');
    }
  }

  function wireSanctionForm() {
    document.getElementById('sanction-form-save').addEventListener('click', saveSanction);
  }

  async function saveSanction() {
    const target_nick = document.getElementById('sanction-form-nick').value.trim();
    const type = document.getElementById('sanction-form-type').value;
    const reason = document.getElementById('sanction-form-reason').value.trim();
    const filesInput = document.getElementById('sanction-form-files');
    const files = filesInput.files ? Array.from(filesInput.files) : [];

    if (!target_nick || !reason) {
      sanctionFormMsg('Rellena el nick y el motivo.', 'error');
      return;
    }
    if (files.length > 6) {
      sanctionFormMsg('Puedes adjuntar como máximo 6 archivos.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('target_nick', target_nick);
    formData.append('type', type);
    formData.append('reason', reason);
    files.forEach((f) => formData.append('files', f));

    const saveBtn = document.getElementById('sanction-form-save');
    saveBtn.disabled = true;
    sanctionFormMsg('Guardando…', 'ok');
    try {
      // Multipart upload: build the request by hand instead of using api(),
      // which always forces a JSON Content-Type. Leave Content-Type unset so
      // the browser attaches the multipart boundary itself.
      const res = await fetch('/api/staff/sanctions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrfToken },
        body: formData,
      });
      const isJson = res.headers.get('content-type')?.includes('application/json');
      const body = isJson ? await res.json().catch(() => null) : null;
      if (!res.ok) {
        throw new Error((body && body.error) || `Error ${res.status}`);
      }
      if (body && Array.isArray(body.fileErrors) && body.fileErrors.length) {
        sanctionFormMsg(`Sanción registrada, pero hubo avisos con algunos archivos: ${body.fileErrors.join(', ')}`, 'error');
      } else {
        sanctionFormMsg('Sanción registrada.', 'ok');
      }
      document.getElementById('sanction-form-nick').value = '';
      document.getElementById('sanction-form-reason').value = '';
      filesInput.value = '';
      loadSanctions();
    } catch (err) {
      sanctionFormMsg(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
    }
  }

  /* ---------- Boot ---------- */

  fetch('/api/auth/me', { credentials: 'include' })
    .then((r) => r.json())
    .then((data) => {
      csrfToken = data.csrfToken || '';
      if (!data.user) return denied('Tienes que iniciar sesión con Discord para ver el panel.', true);
      me = data.user;
      if (!hasPerm('panel.access')) return denied('Tu cuenta no tiene acceso al panel de administración.', false);
      initShell();
    })
    .catch(() => denied('No se pudo cargar el panel. Inténtalo de nuevo en un momento.', false));
})();
