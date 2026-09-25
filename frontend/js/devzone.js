/* ==========================================================================
   devzone.js · internal dev team tool (/devzone.html), built on app-ui.js.
   Tablero (kanban with drag and drop, filters, quick add, keyboard moves),
   Decisiones (append-only timeline), Specs (markdown docs per system).
   Gated by `devzone.access`; writing needs `devzone.manage`.
   ========================================================================== */
(function () {
  const DX = window.DX;
  const { api, drawer, shell, icon, mdEditor, MD_TOOLBAR, denied } = window.DXApp;
  const esc = DX.escapeHtml;
  const root = document.getElementById('app-root');
  let me = null;
  let app = null;
  const canManage = () => DX.hasPerm(me, 'devzone.manage');
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const STATUS = [
    ['no_iniciado', 'No iniciado'],
    ['en_proceso', 'En proceso'],
    ['en_espera', 'En espera'],
    ['terminado', 'Terminado'],
  ];
  const STATUS_LABEL = Object.fromEntries(STATUS);
  const WIP_LIMIT = 6; // soft limit for "En proceso": a hint, never a block
  const DONE_WINDOW_DAYS = 14;

  function md(src) {
    const div = document.createElement('div');
    try {
      div.innerHTML = window.marked && window.DOMPurify ? DOMPurify.sanitize(marked.parse(src || '')) : esc(src || '');
    } catch (err) {
      div.textContent = src || '';
    }
    DX.mdCallouts(div);
    return div.innerHTML;
  }
  function hue(str) {
    let h = 0;
    for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h % 360;
  }
  function initials(name) {
    const n = String(name || '?').trim();
    return `<span class="initials" style="background:hsl(${hue(n)} 55% 42%)" title="${esc(n)}">${esc(n.slice(0, 2))}</span>`;
  }
  function head(title, sub, actions) {
    return `<div class="view-head"><div><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="view-actions">${actions || ''}</div></div>`;
  }

  /* =====================================================================
     TABLERO
     ===================================================================== */
  let tasks = [];
  let members = [];
  let filterWho = '';
  let filterQ = '';
  let showOldDone = false;

  async function renderBoard(view, alive) {
    const [t, m] = await Promise.all([api('/api/devzone/tasks'), api('/api/devzone/members').catch(() => ({ members: [] }))]);
    if (!alive()) return;
    tasks = t.tasks || [];
    members = m.members || [];
    app.setCount('tablero', tasks.filter((x) => x.status !== 'terminado').length);
    const manage = canManage();
    view.innerHTML = `
      ${head('Tablero', 'Quién está en qué, ahora mismo. Antes de empezar algo nuevo, mira si ya hay una tarjeta.', manage ? `<button class="btn btn-accent btn-sm" data-act="new">${icon('plus')}Nueva tarea</button>` : '')}
      <div class="toolbar">
        <label class="search-input">${icon('search')}<span class="sr-only">Buscar tareas</span><input type="search" id="b-q" placeholder="Buscar por título, sistema o repo…" value="${esc(filterQ)}" autocomplete="off"></label>
        <div class="people" id="b-people"></div>
      </div>
      <div class="board" id="board"></div>
      ${manage ? '<p class="board-hint">Arrastra las tarjetas entre columnas, o selecciona una y pulsa <kbd>1</kbd>–<kbd>4</kbd> para moverla. <kbd>N</kbd> crea una tarea nueva.</p>' : ''}`;
    const board = view.querySelector('#board');
    const people = view.querySelector('#b-people');

    function assignees() {
      const counts = new Map();
      tasks.forEach((x) => {
        if (x.status === 'terminado' || !x.assignee_id) return;
        counts.set(x.assignee_id, (counts.get(x.assignee_id) || 0) + 1);
      });
      return [...counts.entries()].sort((a, b) => b[1] - a[1]);
    }
    function drawPeople() {
      const list = assignees();
      people.innerHTML =
        `<button type="button" class="person" data-who="" aria-pressed="${!filterWho}"><span class="initials" style="background:var(--surface-3)">·</span>Todos</button>` +
        list.map(([who, n]) => `<button type="button" class="person" data-who="${esc(who)}" aria-pressed="${filterWho === who}">${initials(who)}${esc(who)}<small>${n}</small></button>`).join('');
    }
    function visible(x) {
      if (filterWho && x.assignee_id !== filterWho) return false;
      if (filterQ && !norm(`${x.title} ${x.system} ${x.repo} ${x.assignee_id || ''}`).includes(norm(filterQ))) return false;
      return true;
    }
    function cardHtml(x) {
      return `<article class="task" draggable="${manage}" tabindex="0" data-id="${x.id}" aria-label="${esc(x.title)}, ${esc(STATUS_LABEL[x.status])}">
        <div class="task-title">${esc(x.title)}</div>
        <div class="task-tags"><span class="tag">${esc(x.system || 'general')}</span>${x.repo ? `<span class="tag repo">${esc(x.repo)}</span>` : ''}</div>
        ${x.blocked_note ? `<div class="task-block">⚠ ${esc(x.blocked_note)}</div>` : ''}
        <div class="task-foot">${x.assignee_id ? `${initials(x.assignee_id)}<span>${esc(x.assignee_id)}</span>` : '<span>Sin asignar</span>'}<time datetime="${esc(x.updated_at)}" title="${esc(DX.formatDate(x.updated_at))}">${esc(DX.relTime(x.updated_at))}</time></div>
      </article>`;
    }
    function drawBoard() {
      const cutoff = Date.now() - DONE_WINDOW_DAYS * 86400000;
      board.innerHTML = STATUS.map(([st, label]) => {
        let items = tasks.filter((x) => x.status === st && visible(x));
        let hidden = 0;
        if (st === 'terminado' && !showOldDone) {
          const recent = items.filter((x) => {
            const d = DX.parseDate(x.updated_at);
            return !d || d.getTime() >= cutoff;
          });
          hidden = items.length - recent.length;
          items = recent;
        }
        const total = tasks.filter((x) => x.status === st).length;
        const over = st === 'en_proceso' && total > WIP_LIMIT;
        return `<section class="col" data-status="${st}" aria-label="${esc(label)}">
          <div class="col-head"><span class="dot"></span><b>${esc(label)}</b><small class="${over ? 'over' : ''}" title="${over ? 'Hay mucho en curso a la vez' : ''}">${st === 'en_proceso' ? `${total}/${WIP_LIMIT}` : total}</small></div>
          ${items.map(cardHtml).join('')}
          ${hidden ? `<button type="button" class="col-more" data-more>Ver ${hidden} terminadas hace más de ${DONE_WINDOW_DAYS} días</button>` : ''}
          ${showOldDone && st === 'terminado' ? '<button type="button" class="col-more" data-less>Ocultar las antiguas</button>' : ''}
          ${manage ? `<form class="quick-add" data-status="${st}"><input type="text" maxlength="160" placeholder="+ Añadir tarea" aria-label="Añadir tarea en ${esc(label)}"></form>` : ''}
        </section>`;
      }).join('');
    }
    function redraw() {
      drawPeople();
      drawBoard();
      app.setCount('tablero', tasks.filter((x) => x.status !== 'terminado').length);
    }
    redraw();

    view.querySelector('#b-q').addEventListener('input', (e) => {
      filterQ = e.target.value.trim();
      drawBoard();
    });
    people.addEventListener('click', (e) => {
      const b = e.target.closest('[data-who]');
      if (!b) return;
      filterWho = b.dataset.who;
      redraw();
    });

    async function move(id, status) {
      const x = tasks.find((t2) => t2.id === id);
      if (!x || x.status === status) return;
      const prev = x.status;
      x.status = status;
      x.updated_at = new Date().toISOString();
      redraw();
      const el = board.querySelector(`[data-id="${id}"]`);
      if (el) {
        el.classList.add('moving');
        el.focus({ preventScroll: true });
      }
      try {
        const res = await api(`/api/devzone/tasks/${id}`, { method: 'PATCH', body: { status } });
        if (res && res.task) Object.assign(x, res.task);
      } catch (err) {
        x.status = prev;
        redraw();
        DX.toast('No se pudo mover la tarea: ' + err.message, 'error');
      }
    }

    board.addEventListener('click', (e) => {
      if (e.target.closest('[data-more]')) {
        showOldDone = true;
        return drawBoard();
      }
      if (e.target.closest('[data-less]')) {
        showOldDone = false;
        return drawBoard();
      }
      const card = e.target.closest('.task');
      if (card) openTask(tasks.find((x) => x.id === Number(card.dataset.id)));
    });
    board.addEventListener('keydown', (e) => {
      const card = e.target.closest('.task');
      if (!card) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openTask(tasks.find((x) => x.id === Number(card.dataset.id)));
      } else if (manage && /^[1-4]$/.test(e.key)) {
        move(Number(card.dataset.id), STATUS[Number(e.key) - 1][0]);
      }
    });
    board.addEventListener('submit', async (e) => {
      const form = e.target.closest('.quick-add');
      if (!form) return;
      e.preventDefault();
      const input = form.querySelector('input');
      const title = input.value.trim();
      if (!title) return;
      input.disabled = true;
      try {
        const res = await api('/api/devzone/tasks', { method: 'POST', body: { title, status: form.dataset.status, system: 'general' } });
        tasks.unshift(res.task);
        redraw();
        const again = board.querySelector(`.quick-add[data-status="${form.dataset.status}"] input`);
        if (again) again.focus();
        DX.toast('Tarea creada. Ábrela para completar los detalles.');
      } catch (err) {
        DX.toast(err.message, 'error');
        input.disabled = false;
      }
    });

    if (manage) {
      let dragId = null;
      board.addEventListener('dragstart', (e) => {
        const card = e.target.closest('.task');
        if (!card) return;
        dragId = Number(card.dataset.id);
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(dragId));
      });
      board.addEventListener('dragend', (e) => {
        const card = e.target.closest('.task');
        if (card) card.classList.remove('dragging');
        board.querySelectorAll('.col.drop').forEach((c) => c.classList.remove('drop'));
      });
      board.addEventListener('dragover', (e) => {
        const col = e.target.closest('.col');
        if (!col || dragId == null) return;
        e.preventDefault();
        board.querySelectorAll('.col.drop').forEach((c) => c !== col && c.classList.remove('drop'));
        col.classList.add('drop');
      });
      board.addEventListener('dragleave', (e) => {
        const col = e.target.closest('.col');
        if (col && !col.contains(e.relatedTarget)) col.classList.remove('drop');
      });
      board.addEventListener('drop', (e) => {
        const col = e.target.closest('.col');
        if (!col || dragId == null) return;
        e.preventDefault();
        col.classList.remove('drop');
        const id = dragId;
        dragId = null;
        move(id, col.dataset.status);
      });
    }
    const nb = view.querySelector('[data-act="new"]');
    if (nb) nb.addEventListener('click', () => openTask(null));
  }

  function openTask(x) {
    const isEdit = !!x;
    const manage = canManage();
    const names = [...new Set(members.map((m) => m.username).filter(Boolean).concat(tasks.map((t) => t.assignee_id).filter(Boolean)))];
    const systems = [...new Set(tasks.map((t) => t.system).filter(Boolean))];
    const repos = [...new Set(tasks.map((t) => t.repo).filter(Boolean))];
    drawer({
      title: isEdit ? (manage ? 'Editar tarea' : 'Tarea') : 'Nueva tarea',
      subtitle: isEdit ? `Creada ${DX.relTime(x.created_at)}${x.created_by_name ? ' por ' + x.created_by_name : ''} · actualizada ${DX.relTime(x.updated_at)}` : '',
      body: `
        <fieldset ${manage ? '' : 'disabled'} style="border:none">
        <div class="field"><label for="k-title">Título</label><input id="k-title" name="title" type="text" maxlength="160" value="${esc(x ? x.title : '')}"></div>
        <div class="field-row-2">
          <div class="field"><label for="k-status">Estado</label><select id="k-status" name="status">${STATUS.map(([k, l]) => `<option value="${k}" ${x && x.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="field"><label for="k-who">Asignado a</label><input id="k-who" name="assignee_id" type="text" maxlength="60" list="k-who-list" value="${esc(x && x.assignee_id ? x.assignee_id : '')}" placeholder="nick de quien lo lleva"><datalist id="k-who-list">${names.map((n) => `<option value="${esc(n)}">`).join('')}</datalist></div>
        </div>
        <div class="field-row-2">
          <div class="field"><label for="k-sys">Sistema</label><input id="k-sys" name="system" type="text" maxlength="40" list="k-sys-list" value="${esc(x ? x.system : '')}" placeholder="muertes, recursos, clanes…"><datalist id="k-sys-list">${systems.map((n) => `<option value="${esc(n)}">`).join('')}</datalist></div>
          <div class="field"><label for="k-repo">Repo</label><input id="k-repo" name="repo" type="text" maxlength="80" list="k-repo-list" value="${esc(x ? x.repo || '' : '')}" placeholder="dx-muertes"><datalist id="k-repo-list">${repos.map((n) => `<option value="${esc(n)}">`).join('')}</datalist></div>
        </div>
        <div class="field"><label for="k-block">Bloqueo (si aplica)</label><input id="k-block" name="blocked_note" type="text" maxlength="200" value="${esc(x ? x.blocked_note || '' : '')}" placeholder="esperando a Gabri"></div>
        <div class="field"><label for="k-desc">Descripción (Markdown)</label><textarea id="k-desc" name="description" maxlength="4000">${esc(x ? x.description || '' : '')}</textarea></div>
        </fieldset>`,
      onSave: manage
        ? async (dr) => {
            const f = dr.form;
            const payload = {
              title: f.elements.title.value.trim(),
              status: f.elements.status.value,
              assignee_id: f.elements.assignee_id.value.trim(),
              system: f.elements.system.value.trim() || 'general',
              repo: f.elements.repo.value.trim(),
              blocked_note: f.elements.blocked_note.value.trim(),
              description: f.elements.description.value.trim(),
            };
            if (!payload.title) throw new Error('Falta el título.');
            if (isEdit) await api(`/api/devzone/tasks/${x.id}`, { method: 'PATCH', body: payload });
            else await api('/api/devzone/tasks', { method: 'POST', body: payload });
            DX.toast(isEdit ? 'Tarea actualizada.' : 'Tarea creada.');
            app.rerender();
          }
        : null,
      onDelete:
        isEdit && manage
          ? async () => {
              await api(`/api/devzone/tasks/${x.id}`, { method: 'DELETE' });
              DX.toast('Tarea eliminada.');
              app.rerender();
            }
          : null,
      deleteTitle: '¿Eliminar tarea?',
      deleteConfirm: 'Si ya está hecha, mejor muévela a Terminado: así queda constancia.',
    });
  }

  /* =====================================================================
     DECISIONES
     ===================================================================== */
  async function renderDecisions(view, alive) {
    const data = await api('/api/devzone/decisions');
    if (!alive()) return;
    const list = data.decisions || [];
    app.setCount('decisiones', list.length);
    const systems = [...new Set(list.map((d) => d.system || 'general'))];
    view.innerHTML = `
      ${head('Decisiones', 'Registro de lo ya confirmado. No se edita: si algo cambia, se añade una entrada nueva que la sustituye.', canManage() ? `<button class="btn btn-accent btn-sm" data-act="new">${icon('plus')}Registrar decisión</button>` : '')}
      <div class="toolbar"><label class="search-input">${icon('search')}<span class="sr-only">Buscar</span><input type="search" id="d-q" placeholder="Buscar decisiones…" autocomplete="off"></label>
        <select class="input" id="d-sys" style="max-width:200px"><option value="">Todos los sistemas</option>${systems.map((s) => `<option>${esc(s)}</option>`).join('')}</select></div>
      <div class="timeline" id="d-list"></div>`;
    const out = view.querySelector('#d-list');
    const q = view.querySelector('#d-q');
    const sys = view.querySelector('#d-sys');
    function draw() {
      const needle = norm(q.value.trim());
      const items = list.filter((d) => (!sys.value || (d.system || 'general') === sys.value) && (!needle || norm(d.title + ' ' + d.body).includes(needle)));
      let lastMonth = '';
      out.innerHTML = items.length
        ? items
            .map((d) => {
              const date = DX.parseDate(d.created_at);
              const month = date ? date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : '';
              const sep = month !== lastMonth ? `<div class="day-sep">${esc(month)}</div>` : '';
              lastMonth = month;
              return `${sep}<article class="decision">
                <div class="decision-head"><span class="tag">${esc(d.system || 'general')}</span><h3>${esc(d.title)}</h3></div>
                <p class="decision-meta">${esc(d.author_name || d.author_id)} · <span title="${esc(DX.formatDate(d.created_at))}">${esc(DX.relTime(d.created_at))}</span></p>
                <div class="decision-body md-content">${d.body ? md(d.body) : ''}</div>
              </article>`;
            })
            .join('')
        : `<div class="empty-state">${list.length ? 'Nada coincide con el filtro.' : 'Todavía no hay decisiones registradas.'}</div>`;
    }
    q.addEventListener('input', draw);
    sys.addEventListener('change', draw);
    draw();
    const nb = view.querySelector('[data-act="new"]');
    if (nb) nb.addEventListener('click', () => openDecision(list));
  }

  function openDecision(list) {
    const systems = [...new Set((list || []).map((d) => d.system).filter(Boolean))];
    drawer({
      title: 'Registrar decisión',
      subtitle: 'Queda fija una vez registrada. Revísala antes de guardar.',
      wide: true,
      saveLabel: 'Registrar',
      body: `
        <div class="field-row-2">
          <div class="field"><label for="dd-title">Título</label><input id="dd-title" name="title" type="text" maxlength="160" placeholder="Muertes con timer, no destierro"></div>
          <div class="field"><label for="dd-sys">Sistema</label><input id="dd-sys" name="system" type="text" maxlength="40" list="dd-sys-list" placeholder="muertes"><datalist id="dd-sys-list">${systems.map((s) => `<option value="${esc(s)}">`).join('')}</datalist></div>
        </div>
        <div class="field"><span class="field-label">Detalle (Markdown, opcional)</span>
          <div class="md-editor"><div>${MD_TOOLBAR}<textarea name="body" maxlength="20000" placeholder="Por qué se decidió y qué cambia…"></textarea></div><div class="md-preview md-content"></div></div></div>`,
      onOpen(dr) {
        mdEditor(dr.form.elements.body, dr.form.querySelector('.md-preview'));
      },
      async onSave(dr) {
        const f = dr.form;
        const payload = { title: f.elements.title.value.trim(), system: f.elements.system.value.trim() || 'general', body: f.elements.body.value.trim() };
        if (!payload.title) throw new Error('Falta el título.');
        if (!(await DX.confirm('Las decisiones no se pueden editar ni borrar después.', { title: '¿Registrar decisión?', okLabel: 'Registrar', danger: false }))) return false;
        await api('/api/devzone/decisions', { method: 'POST', body: payload });
        DX.toast('Decisión registrada.');
        app.rerender();
      },
    });
  }

  /* =====================================================================
     SPECS
     ===================================================================== */
  let specs = [];
  async function renderSpecs(view, alive) {
    const data = await api('/api/devzone/specs');
    if (!alive()) return;
    specs = data.specs || [];
    app.setCount('specs', specs.length);
    view.innerHTML = `
      ${head('Specs por sistema', 'Copia de trabajo del Google Doc. El Doc es la fuente viva: si algo no encaja, revísalo antes de asumir esto.', canManage() ? `<button class="btn btn-accent btn-sm" data-act="new">${icon('plus')}Nueva spec</button>` : '')}
      <div class="specs"><nav class="spec-list" id="sp-list" aria-label="Specs"></nav><article class="spec-doc" id="sp-doc"></article></div>`;
    const listEl = view.querySelector('#sp-list');
    const doc = view.querySelector('#sp-doc');
    const bySys = new Map();
    specs.forEach((s) => {
      const k = s.system || 'general';
      if (!bySys.has(k)) bySys.set(k, []);
      bySys.get(k).push(s);
    });
    listEl.innerHTML = specs.length
      ? [...bySys.entries()].map(([sys, items]) => `<div><h3>${esc(sys)}</h3>${items.map((s) => `<a href="#specs/${encodeURIComponent(s.slug)}" data-slug="${esc(s.slug)}">${esc(s.title)}</a>`).join('')}</div>`).join('')
      : '<p class="panel-sub">Sin specs todavía.</p>';
    const nb = view.querySelector('[data-act="new"]');
    if (nb) nb.addEventListener('click', () => openSpec(null));
    const wanted = decodeURIComponent((location.hash.split('/')[1] || ''));
    const slug = specs.some((s) => s.slug === wanted) ? wanted : specs[0] && specs[0].slug;
    if (slug) loadSpec(slug);
    else doc.innerHTML = '<div class="empty-state"><strong>Sin specs todavía</strong>Crea la primera para empezar.</div>';

    async function loadSpec(s) {
      listEl.querySelectorAll('a').forEach((a) => (a.dataset.slug === s ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
      doc.innerHTML = '<div class="skeleton" style="height:30px;width:50%;margin-bottom:16px"></div><div class="skeleton" style="height:200px"></div>';
      try {
        const { spec } = await api('/api/devzone/specs/' + encodeURIComponent(s));
        doc.innerHTML = `
          <div class="spec-doc-head"><h1>${esc(spec.title)}</h1>${canManage() ? `<button class="btn btn-ghost btn-sm" data-edit>${icon('edit')}Editar</button>` : ''}</div>
          <p class="spec-meta">${esc(spec.system || 'general')}${spec.source_note ? ' · ' + esc(spec.source_note) : ''} · actualizada <span title="${esc(DX.formatDate(spec.updated_at))}">${esc(DX.relTime(spec.updated_at))}</span></p>
          <div class="md-content">${md(spec.content)}</div>`;
        const eb = doc.querySelector('[data-edit]');
        if (eb) eb.addEventListener('click', () => openSpec(spec));
      } catch (err) {
        doc.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
      }
    }
    app.loadSpec = loadSpec;
  }

  function openSpec(spec) {
    const isEdit = !!spec;
    drawer({
      title: isEdit ? `Editar ${spec.title}` : 'Nueva spec',
      wide: true,
      body: `
        <div class="field-row-2">
          <div class="field"><label for="sp-title">Título</label><input id="sp-title" name="title" type="text" maxlength="120" value="${esc(spec ? spec.title : '')}"></div>
          <div class="field"><label for="sp-slug">Slug</label><input id="sp-slug" name="slug" type="text" maxlength="60" value="${esc(spec ? spec.slug : '')}" ${isEdit ? 'disabled' : ''} placeholder="muertes"></div>
        </div>
        <div class="field-row-2">
          <div class="field"><label for="sp-sys">Sistema</label><input id="sp-sys" name="system" type="text" maxlength="40" value="${esc(spec ? spec.system : '')}" placeholder="muertes"></div>
          <div class="field"><label for="sp-src">Origen (opcional)</label><input id="sp-src" name="source_note" type="text" maxlength="200" value="${esc(spec ? spec.source_note || '' : '')}" placeholder="Google Doc, sección 3"></div>
        </div>
        <div class="field"><span class="field-label">Contenido (Markdown)</span>
          <div class="md-editor"><div>${MD_TOOLBAR}<textarea name="content">${esc(spec ? spec.content || '' : '')}</textarea></div><div class="md-preview md-content"></div></div></div>`,
      onOpen(dr) {
        const f = dr.form;
        if (!isEdit) {
          let touched = false;
          f.elements.slug.addEventListener('input', () => (touched = true));
          f.elements.title.addEventListener('input', () => {
            if (!touched) f.elements.slug.value = norm(f.elements.title.value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
          });
        }
        mdEditor(f.elements.content, f.querySelector('.md-preview'));
      },
      async onSave(dr) {
        const f = dr.form;
        const slug = isEdit ? spec.slug : f.elements.slug.value.trim().toLowerCase();
        const payload = {
          title: f.elements.title.value.trim(),
          system: f.elements.system.value.trim() || 'general',
          source_note: f.elements.source_note.value.trim(),
          content: f.elements.content.value,
          create: !isEdit,
        };
        if (!/^[a-z0-9-]{1,60}$/.test(slug)) throw new Error('Slug inválido: minúsculas, números y guiones.');
        if (!payload.title) throw new Error('Falta el título.');
        await api('/api/devzone/specs/' + encodeURIComponent(slug), { method: 'PUT', body: payload });
        DX.toast(isEdit ? 'Spec actualizada.' : 'Spec creada.');
        location.hash = 'specs/' + slug;
        app.rerender();
      },
      onDelete: isEdit
        ? async () => {
            await api('/api/devzone/specs/' + encodeURIComponent(spec.slug), { method: 'DELETE' });
            DX.toast('Spec eliminada.');
            location.hash = 'specs';
            app.rerender();
          }
        : null,
      deleteTitle: '¿Eliminar spec?',
    });
  }

  /* =====================================================================
     BOOT
     ===================================================================== */
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'n' || e.ctrlKey || e.metaKey || e.altKey || !canManage()) return;
    if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '') || document.querySelector('.drawer, .cmdk-overlay, .dialog-overlay')) return;
    if (location.hash.startsWith('#tablero') || !location.hash) openTask(null);
  });

  DX.me.then((session) => {
    if (!session || !session.user) return denied(root, 'Dev Zone', 'Inicia sesión con Discord para entrar.', true, '/devzone.html');
    me = session.user;
    if (!DX.hasPerm(me, 'devzone.access')) return denied(root, 'Sin acceso', 'Dev Zone es solo para el equipo de desarrollo.', false);
    app = shell({
      root,
      user: me,
      name: 'Dev Zone',
      brand: `<a class="app-brand" href="/devzone.html"><img class="dz-title" src="/assets/devzonetitle.png" alt="Dev Zone"></a>`,
      groups: [
        {
          items: [
            { id: 'tablero', label: 'Tablero', icon: 'board', render: renderBoard, onSub: (s) => s === 'new' && canManage() && openTask(null) },
            { id: 'decisiones', label: 'Decisiones', icon: 'scroll', render: renderDecisions },
            { id: 'specs', label: 'Specs', icon: 'file', render: renderSpecs, onSub: (s) => s !== 'new' && app && app.loadSpec && app.loadSpec(decodeURIComponent(s)) },
          ],
        },
      ],
      footLinks: [{ href: '/', label: 'Ver la web', icon: 'ext' }].concat(DX.hasPerm(me, 'panel.access') ? [{ href: '/admin.html', label: 'Panel de staff', icon: 'shield' }] : []),
      commands: [
        canManage() && { group: 'Acciones', label: 'Nueva tarea', icon: 'plus', hint: 'N', run: () => (location.hash = 'tablero/new') },
        canManage() && { group: 'Acciones', label: 'Registrar decisión', icon: 'scroll', run: () => (location.hash = 'decisiones') },
        { group: 'Enlaces', label: 'Abrir la web pública', icon: 'ext', run: () => window.open('/', '_blank') },
      ].filter(Boolean),
    });
  });
})();
