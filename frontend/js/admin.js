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

    document.querySelectorAll('.panel-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.panel-nav-btn').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.panel-section').forEach((s) => s.classList.remove('active'));
        btn.classList.add('active');
        const section = document.getElementById('section-' + btn.dataset.section);
        section.classList.add('active');
        if (btn.dataset.section === 'roles') loadRoles();
        if (btn.dataset.section === 'usage') loadUsage();
      });
    });

    wireRoleForm();
    wireUserSearch();
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
      wrap.innerHTML = '<span class="panel-section-sub">Sin resultados. Probá con el ID de Discord completo para asignarle un rango a alguien que todavía no inició sesión.</span>';
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

  /* ---------- Boot ---------- */

  fetch('/api/auth/me', { credentials: 'include' })
    .then((r) => r.json())
    .then((data) => {
      csrfToken = data.csrfToken || '';
      if (!data.user) return denied('Tenés que iniciar sesión con Discord para ver el panel.', true);
      me = data.user;
      if (!hasPerm('panel.access')) return denied('Tu cuenta no tiene acceso al panel de administración.', false);
      initShell();
    })
    .catch(() => denied('No se pudo cargar el panel. Probá de nuevo en un rato.', false));
})();
