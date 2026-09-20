/* Dev Zone: página standalone, gateada por el permiso `devzone.access`.
 * Mismo patrón de arranque de sesión que frontend/js/admin.js (fetch
 * /api/auth/me → denied() o initShell()), pero sin el resto del panel de
 * Staff: tres vistas propias (tareas / decisiones / specs). */
(function () {
  const root = document.getElementById('devzone-root');
  const modalOverlay = document.getElementById('devzone-modal-overlay');
  const modal = document.getElementById('devzone-modal');

  let csrfToken = '';
  let me = null;
  let tasks = [];
  let decisions = [];
  let specs = [];

  const STATUS_LABELS = {
    no_iniciado: 'No iniciado',
    en_proceso: 'En proceso',
    en_espera: 'En espera',
    terminado: 'Terminado',
  };
  const STATUS_ORDER = ['no_iniciado', 'en_proceso', 'en_espera', 'terminado'];

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch (err) {
      return '';
    }
  }

  function renderMarkdown(md) {
    try {
      if (window.marked && window.DOMPurify) {
        return window.DOMPurify.sanitize(window.marked.parse(md || ''));
      }
    } catch (err) {}
    return `<p>${escapeHtml(md || '')}</p>`;
  }

  function denied(message, showLogin) {
    root.innerHTML = `
      <div class="devzone-loading">
        <p>${escapeHtml(message)}</p>
        ${showLogin
          ? `<a class="btn btn-discord btn-sm" href="/api/auth/login?return_to=/devzone.html">Iniciar sesión con Discord</a>`
          : `<a class="btn btn-ghost btn-sm" href="index.html">Volver al sitio</a>`}
      </div>`;
  }

  async function api(path, options = {}) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (options.method && options.method !== 'GET') headers['X-CSRF-Token'] = csrfToken;
    const res = await fetch(path, { credentials: 'include', ...options, headers });
    const isJson = res.headers.get('content-type')?.includes('application/json');
    const body = isJson ? await res.json().catch(() => null) : null;
    if (!res.ok) throw new Error((body && body.error) || `Error ${res.status}`);
    return body;
  }

  function closeModal() {
    modalOverlay.hidden = true;
    modal.innerHTML = '';
  }
  function openModal(html) {
    modal.innerHTML = html;
    modalOverlay.hidden = false;
    const cancel = document.getElementById('modal-cancel');
    if (cancel) cancel.addEventListener('click', closeModal);
  }
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalOverlay.hidden) closeModal();
  });

  function showModalError(msg) {
    const el = document.getElementById('modal-error');
    if (el) {
      el.textContent = msg;
      el.hidden = false;
    }
  }

  function initShell() {
    const tpl = document.getElementById('tpl-devzone');
    root.innerHTML = '';
    root.appendChild(tpl.content.cloneNode(true));

    document.getElementById('devzone-user').innerHTML =
      `<img src="${escapeHtml(me.avatar || '')}" alt=""><span>${escapeHtml(me.username || me.id)}</span>`;

    document.querySelectorAll('.devzone-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.devzone-nav-btn').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.devzone-section').forEach((s) => s.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('devzone-section-' + btn.dataset.section).classList.add('active');
      });
    });

    document.getElementById('devzone-task-new').addEventListener('click', () => openTaskModal());
    document.getElementById('devzone-decision-new').addEventListener('click', () => openDecisionModal());
    document.getElementById('devzone-spec-new').addEventListener('click', () => openSpecModal());

    loadTasks();
    loadDecisions();
    loadSpecs();
  }

  /* ---------- tareas ---------- */

  function loadTasks() {
    api('/api/devzone/tasks')
      .then((data) => {
        tasks = data.tasks || [];
        renderBoard();
      })
      .catch(() => {
        document.getElementById('devzone-board').innerHTML = '<p class="devzone-content-msg">No se pudieron cargar las tareas.</p>';
      });
  }

  function cardHtml(t) {
    return `
      <div class="devzone-card" data-id="${t.id}">
        <div class="devzone-card-title">${escapeHtml(t.title)}</div>
        <div class="devzone-card-meta">
          <span class="devzone-tag">${escapeHtml(t.system)}</span>
          ${t.repo ? `<span class="devzone-tag">${escapeHtml(t.repo)}</span>` : ''}
        </div>
        ${t.assignee_id ? `<div class="devzone-card-assignee">&rarr; ${escapeHtml(t.assignee_id)}</div>` : ''}
        ${t.blocked_note ? `<div class="devzone-card-blocked">&#9888; ${escapeHtml(t.blocked_note)}</div>` : ''}
      </div>`;
  }

  function renderBoard() {
    const board = document.getElementById('devzone-board');
    board.innerHTML = STATUS_ORDER.map((status) => {
      const items = tasks.filter((t) => t.status === status);
      return `
        <div class="devzone-col">
          <div class="devzone-col-title"><span>${STATUS_LABELS[status]}</span><span>${items.length}</span></div>
          ${items.map(cardHtml).join('')}
        </div>`;
    }).join('');

    board.querySelectorAll('.devzone-card').forEach((card) => {
      card.addEventListener('click', () => {
        const task = tasks.find((t) => String(t.id) === card.dataset.id);
        if (task) openTaskModal(task);
      });
    });
  }

  function openTaskModal(task) {
    const isEdit = !!task;
    openModal(`
      <h2>${isEdit ? 'Editar tarea' : 'Nueva tarea'}</h2>
      <div class="devzone-field"><label>Título</label><input id="f-title" value="${task ? escapeHtml(task.title) : ''}"></div>
      <div class="devzone-field"><label>Sistema</label><input id="f-system" value="${task ? escapeHtml(task.system) : ''}" placeholder="muertes, recursos, clanes..."></div>
      <div class="devzone-field"><label>Estado</label>
        <select id="f-status">
          ${STATUS_ORDER.map((s) => `<option value="${s}" ${task && task.status === s ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`).join('')}
        </select>
      </div>
      <div class="devzone-field"><label>Asignado a</label><input id="f-assignee" value="${task && task.assignee_id ? escapeHtml(task.assignee_id) : ''}" placeholder="nick de quien lo lleva"></div>
      <div class="devzone-field"><label>Repo</label><input id="f-repo" value="${task ? escapeHtml(task.repo || '') : ''}" placeholder="ej. dx-muertes"></div>
      <div class="devzone-field"><label>Nota de bloqueo (si aplica)</label><input id="f-blocked" value="${task ? escapeHtml(task.blocked_note || '') : ''}" placeholder="ej. esperando a Gabri"></div>
      <div class="devzone-field"><label>Descripción</label><textarea id="f-desc">${task ? escapeHtml(task.description || '') : ''}</textarea></div>
      <p class="devzone-modal-error" id="modal-error" hidden></p>
      <div class="devzone-modal-actions">
        ${isEdit ? `<button class="btn btn-ghost btn-sm" id="modal-delete">Eliminar</button>` : ''}
        <button class="btn btn-ghost btn-sm" id="modal-cancel">Cancelar</button>
        <button class="btn btn-accent btn-sm" id="modal-save">Guardar</button>
      </div>
    `);

    if (isEdit) {
      document.getElementById('modal-delete').addEventListener('click', async () => {
        try {
          await api(`/api/devzone/tasks/${task.id}`, { method: 'DELETE' });
          closeModal();
          loadTasks();
        } catch (err) {
          showModalError(err.message);
        }
      });
    }

    document.getElementById('modal-save').addEventListener('click', async () => {
      const payload = {
        title: document.getElementById('f-title').value.trim(),
        system: document.getElementById('f-system').value.trim() || 'general',
        status: document.getElementById('f-status').value,
        assignee_id: document.getElementById('f-assignee').value.trim(),
        repo: document.getElementById('f-repo').value.trim(),
        blocked_note: document.getElementById('f-blocked').value.trim(),
        description: document.getElementById('f-desc').value.trim(),
      };
      if (!payload.title) return showModalError('Falta el título.');
      try {
        if (isEdit) await api(`/api/devzone/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        else await api('/api/devzone/tasks', { method: 'POST', body: JSON.stringify(payload) });
        closeModal();
        loadTasks();
      } catch (err) {
        showModalError(err.message);
      }
    });
  }

  /* ---------- decisiones ---------- */

  function loadDecisions() {
    api('/api/devzone/decisions')
      .then((data) => {
        decisions = data.decisions || [];
        renderDecisions();
      })
      .catch(() => {
        document.getElementById('devzone-decisions-list').innerHTML = '<p class="devzone-content-msg">No se pudieron cargar las decisiones.</p>';
      });
  }

  function renderDecisions() {
    const list = document.getElementById('devzone-decisions-list');
    if (!decisions.length) {
      list.innerHTML = '<p class="devzone-content-msg">Todavía no hay decisiones registradas.</p>';
      return;
    }
    list.innerHTML = decisions.map((d) => `
      <div class="devzone-decision">
        <div class="devzone-decision-head">
          <span class="devzone-tag">${escapeHtml(d.system)}</span>
          <span class="devzone-decision-title">${escapeHtml(d.title)}</span>
          <span class="devzone-decision-date">${escapeHtml(d.author_name || d.author_id)} · ${formatDate(d.created_at)}</span>
        </div>
        <div class="devzone-decision-body md-content">${renderMarkdown(d.body)}</div>
      </div>
    `).join('');
  }

  function openDecisionModal() {
    openModal(`
      <h2>Registrar decisión</h2>
      <div class="devzone-field"><label>Título</label><input id="f-title" placeholder="ej. Muertes ahora con timer, no destierro"></div>
      <div class="devzone-field"><label>Sistema</label><input id="f-system" placeholder="muertes, recursos, clanes..."></div>
      <div class="devzone-field"><label>Detalle (markdown, opcional)</label><textarea id="f-body" placeholder="Por qué se decidió, qué cambia..."></textarea></div>
      <p class="devzone-modal-error" id="modal-error" hidden></p>
      <div class="devzone-modal-actions">
        <button class="btn btn-ghost btn-sm" id="modal-cancel">Cancelar</button>
        <button class="btn btn-accent btn-sm" id="modal-save">Registrar</button>
      </div>
    `);

    document.getElementById('modal-save').addEventListener('click', async () => {
      const title = document.getElementById('f-title').value.trim();
      const system = document.getElementById('f-system').value.trim() || 'general';
      const body = document.getElementById('f-body').value.trim();
      if (!title) return showModalError('Falta el título.');
      try {
        await api('/api/devzone/decisions', { method: 'POST', body: JSON.stringify({ title, system, body }) });
        closeModal();
        loadDecisions();
      } catch (err) {
        showModalError(err.message);
      }
    });
  }

  /* ---------- specs ---------- */

  function loadSpecs() {
    api('/api/devzone/specs')
      .then((data) => {
        specs = data.specs || [];
        renderSpecsSidebar();
        if (specs.length) loadSpec(specs[0].slug);
        else document.getElementById('devzone-specs-content').innerHTML = '<p class="devzone-content-msg">Sin specs todavía. Crea la primera.</p>';
      })
      .catch(() => {
        document.getElementById('devzone-specs-content').innerHTML = '<p class="devzone-content-msg">No se pudieron cargar las specs.</p>';
      });
  }

  function renderSpecsSidebar() {
    const sidebar = document.getElementById('devzone-specs-sidebar');
    if (!specs.length) {
      sidebar.innerHTML = '';
      return;
    }
    const bySystem = new Map();
    specs.forEach((s) => {
      const sys = s.system || 'general';
      if (!bySystem.has(sys)) bySystem.set(sys, []);
      bySystem.get(sys).push(s);
    });
    sidebar.innerHTML = [...bySystem.entries()].map(([sys, items]) => `
      <div class="wiki-cat">
        <div class="wiki-cat-title">${escapeHtml(sys)}</div>
        ${items.map((s) => `<a href="#" class="devzone-spec-link" data-slug="${escapeHtml(s.slug)}">${escapeHtml(s.title)}</a>`).join('')}
      </div>
    `).join('');

    sidebar.querySelectorAll('.devzone-spec-link').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        loadSpec(a.dataset.slug);
      });
    });
  }

  function setActiveSpec(slug) {
    document.querySelectorAll('.devzone-spec-link').forEach((a) => a.classList.toggle('active', a.dataset.slug === slug));
  }

  function loadSpec(slug) {
    setActiveSpec(slug);
    const content = document.getElementById('devzone-specs-content');
    content.innerHTML = '<p class="devzone-content-msg">Cargando…</p>';
    api('/api/devzone/specs/' + encodeURIComponent(slug))
      .then((data) => {
        const spec = data.spec;
        if (!spec) return Promise.reject();
        content.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
            <h1>${escapeHtml(spec.title)}</h1>
            <button class="btn btn-ghost btn-sm" id="spec-edit-btn">Editar</button>
          </div>
          <p class="devzone-spec-meta">${spec.source_note ? escapeHtml(spec.source_note) + ' · ' : ''}actualizado ${formatDate(spec.updated_at)}</p>
          <div class="md-content">${renderMarkdown(spec.content)}</div>
        `;
        document.getElementById('spec-edit-btn').addEventListener('click', () => openSpecModal(spec));
      })
      .catch(() => {
        content.innerHTML = '<p class="devzone-content-msg">No se pudo cargar esta spec.</p>';
      });
  }

  function openSpecModal(spec) {
    const isEdit = !!spec;
    openModal(`
      <h2>${isEdit ? 'Editar spec' : 'Nueva spec'}</h2>
      <div class="devzone-field"><label>Slug (id corto, ej. muertes)</label><input id="f-slug" value="${spec ? escapeHtml(spec.slug) : ''}" ${isEdit ? 'disabled' : ''}></div>
      <div class="devzone-field"><label>Título</label><input id="f-title" value="${spec ? escapeHtml(spec.title) : ''}"></div>
      <div class="devzone-field"><label>Sistema</label><input id="f-system" value="${spec ? escapeHtml(spec.system) : ''}" placeholder="muertes, recursos, clanes..."></div>
      <div class="devzone-field"><label>Nota de origen (opcional)</label><input id="f-source" value="${spec ? escapeHtml(spec.source_note || '') : ''}" placeholder="ej. Google Doc, sección 3"></div>
      <div class="devzone-field"><label>Contenido (markdown)</label><textarea id="f-content">${spec ? escapeHtml(spec.content || '') : ''}</textarea></div>
      <p class="devzone-modal-error" id="modal-error" hidden></p>
      <div class="devzone-modal-actions">
        <button class="btn btn-ghost btn-sm" id="modal-cancel">Cancelar</button>
        <button class="btn btn-accent btn-sm" id="modal-save">Guardar</button>
      </div>
    `);

    document.getElementById('modal-save').addEventListener('click', async () => {
      const slug = document.getElementById('f-slug').value.trim().toLowerCase();
      const title = document.getElementById('f-title').value.trim();
      const system = document.getElementById('f-system').value.trim() || 'general';
      const sourceNote = document.getElementById('f-source').value.trim();
      const content = document.getElementById('f-content').value;
      if (!slug || !/^[a-z0-9-]+$/.test(slug)) return showModalError('Slug inválido (minúsculas, números, guiones).');
      if (!title) return showModalError('Falta el título.');
      try {
        await api('/api/devzone/specs/' + encodeURIComponent(slug), {
          method: 'PUT',
          body: JSON.stringify({ title, system, source_note: sourceNote, content }),
        });
        closeModal();
        loadSpecs();
      } catch (err) {
        showModalError(err.message);
      }
    });
  }

  /* ---------- boot ---------- */

  fetch('/api/auth/me', { credentials: 'include' })
    .then((r) => r.json())
    .then((data) => {
      csrfToken = data.csrfToken || '';
      if (!data.user) return denied('Tienes que iniciar sesión con Discord para entrar a Dev Zone.', true);
      me = data.user;
      const canAccess = Array.isArray(me.permissions) && me.permissions.includes('devzone.access');
      if (!canAccess) return denied('Tu cuenta no tiene acceso a Dev Zone.', false);
      initShell();
    })
    .catch(() => denied('No se pudo cargar Dev Zone. Inténtalo de nuevo en un momento.', false));
})();
