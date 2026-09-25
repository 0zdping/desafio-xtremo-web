/* ==========================================================================
   admin.js · staff panel (/admin.html), built on app-ui.js.
   Sections: Resumen, Anuncios, Wiki, Equipo, Sanciones, Estadísticas,
   Uso de recursos, Rangos y permisos. Every mutation is also enforced
   server-side; the permission checks here only decide what to show.
   ========================================================================== */
(function () {
  const DX = window.DX;
  const { api, drawer, shell, icon, mdEditor, MD_TOOLBAR, lineChart, denied } = window.DXApp;
  const esc = DX.escapeHtml;
  const root = document.getElementById('app-root');
  let me = null;
  let app = null;
  const can = (k) => DX.hasPerm(me, k);

  const slugify = (s) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const num = (n) => (Number(n) || 0).toLocaleString('es-ES');
  // Mirrors backend/lib/permissions.js so the UI only offers what the
  // server will accept (the server still enforces it on every request).
  const myRank = () => {
    const roles = (me && me.roles) || [];
    if (!roles.length) return -Infinity;
    if (roles.some((r) => r.is_locked)) return Infinity;
    return Math.max(...roles.map((r) => Number(r.position) || 0));
  };
  const canTouchRole = (r) => myRank() === Infinity || (!r.is_locked && (Number(r.position) || 0) < myRank());
  // Locked roles (Owner/Co-Owner) can be assigned by their holders but never edited or deleted.
  const canEditRole = (r) => !r.is_locked && canTouchRole(r);
  // Whether I may change someone's roles at all (never peers or superiors).
  const canTouchUser = (u) => {
    if (myRank() === Infinity || String(u.id) === String(me.id)) return true;
    const ranks = (u.roles || []).map((ur) => rolesCache.find((r) => r.id === ur.id)).filter(Boolean);
    const theirs = ranks.some((r) => r.is_locked) ? Infinity : ranks.length ? Math.max(...ranks.map((r) => Number(r.position) || 0)) : -Infinity;
    return theirs < myRank();
  };
  // Skin renders by nick can fail (renamed account, renderer hiccup): fall
  // back to a neutral block instead of a broken-image icon.
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (img && img.classList && img.classList.contains('face') && !img.dataset.fallback) {
      img.dataset.fallback = '1';
      img.src = DX.defaultAvatar;
    }
  }, true);
  const hex6 = (c, fb) => {
    const v = DX.safeColor(c, fb || '#37d6b4');
    return /^#[0-9a-f]{3}$/i.test(v) ? '#' + v.slice(1).split('').map((x) => x + x).join('') : v.slice(0, 7);
  };
  const face = (m, size) => `https://vzge.me/face/${size || 64}/${encodeURIComponent(m.mc_uuid || m.mc_nick || 'steve')}`;

  function head(title, sub, actions) {
    return `<div class="view-head"><div><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="view-actions">${actions || ''}</div></div>`;
  }
  function searchBox(id, ph) {
    return `<label class="search-input">${icon('search')}<span class="sr-only">${esc(ph)}</span><input type="search" id="${id}" placeholder="${esc(ph)}" autocomplete="off"></label>`;
  }
  function emptyRow(cols, text) {
    return `<tr><td colspan="${cols}"><div class="empty-state">${esc(text)}</div></td></tr>`;
  }
  function charCounter(input, max) {
    const hint = input.parentElement.querySelector('.field-hint[data-count]');
    if (!hint) return;
    const upd = () => (hint.textContent = `${input.value.length}/${max}`);
    input.addEventListener('input', upd);
    upd();
  }

  /* =====================================================================
     RESUMEN
     ===================================================================== */
  async function renderOverview(view, alive) {
    const tasks = [
      api('/api/admin/announcements').catch(() => null),
      api('/api/admin/wiki').catch(() => null),
      api('/api/admin/team').catch(() => null),
      can('panel.view_stats') ? api('/api/admin/stats?range=7d').catch(() => null) : null,
      can('sanctions.access') ? api('/api/staff/sanctions').catch(() => null) : null,
    ];
    const [ann, wiki, team, stats, sanc] = await Promise.all(tasks);
    if (!alive()) return;
    const hour = new Date().getHours();
    const hello = hour < 7 ? 'Buenas noches' : hour < 14 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches';
    const anns = (ann && ann.announcements) || [];
    const kpis = [];
    if (stats) kpis.push(['Visitas · 7 días', num(stats.totals.pageviews), '#estadisticas']);
    if (stats) kpis.push(['Visitantes únicos', num(stats.totals.uniques), '#estadisticas']);
    kpis.push(['Anuncios', num(anns.length), '#anuncios']);
    kpis.push(['Páginas de wiki', num(((wiki && wiki.pages) || []).length), '#wiki']);
    kpis.push(['Miembros del equipo', num(((team && team.members) || []).length), '#equipo']);
    if (sanc) kpis.push(['Sanciones', num((sanc.sanctions || []).length), '#sanciones']);

    const quick = [
      can('announcements.manage') ? `<a class="btn btn-accent btn-sm" href="#anuncios/new">${icon('plus')}Nuevo anuncio</a>` : '',
      can('wiki.manage') ? `<a class="btn btn-ghost btn-sm" href="#wiki/new">${icon('book')}Nueva página</a>` : '',
      can('sanctions.access') ? `<a class="btn btn-ghost btn-sm" href="#sanciones/new">${icon('gavel')}Registrar sanción</a>` : '',
    ].join('');

    view.innerHTML = `
      ${head(`${hello}, ${me.username || 'staff'}`, 'Esto es lo que está pasando en la web del evento.', quick)}
      <div class="kpis">${kpis.map(([l, v, h]) => `<a class="kpi" href="${h}"><span class="kpi-label">${esc(l)}</span><span class="kpi-value">${v}</span></a>`).join('')}</div>
      <div class="grid-2">
        <section class="panel">
          <h2>Últimos anuncios <a class="btn btn-ghost btn-sm" href="#anuncios">Ver todos</a></h2>
          ${
            anns.length
              ? `<div class="barlist">${anns
                  .slice(0, 5)
                  .map((a) => `<a class="bar-row" style="--w:0;text-decoration:none" href="/anuncios/${encodeURIComponent(a.slug || '')}" target="_blank" rel="noopener"><span>${a.pinned ? '★ ' : ''}${esc(a.title)}</span><b>${esc(DX.relTime(a.created_at))}</b></a>`)
                  .join('')}</div>`
              : '<p class="panel-sub">Todavía no hay anuncios.</p>'
          }
        </section>
        <section class="panel">
          <h2>Tus rangos</h2>
          <div>${(me.roles || []).map((r) => `<span class="role-pill"><span class="swatch" style="background:${DX.safeColor(r.color)}"></span>${esc(r.name)}</span>`).join('') || '<p class="panel-sub">Sin rangos asignados.</p>'}</div>
          <h2 style="margin-top:18px">Permisos activos</h2>
          <div>${(me.permissions || []).map((p) => `<span class="badge" style="margin:0 4px 4px 0">${esc(p)}</span>`).join('')}</div>
        </section>
      </div>`;
  }

  /* =====================================================================
     ANUNCIOS
     ===================================================================== */
  let annCache = [];
  async function renderAnnouncements(view, alive) {
    const data = await api('/api/admin/announcements');
    if (!alive()) return;
    annCache = data.announcements || [];
    app.setCount('anuncios', annCache.length);
    const manage = can('announcements.manage');
    const cats = [...new Set(annCache.map((a) => a.category || 'Anuncio'))];
    view.innerHTML = `
      ${head('Anuncios', 'Posts del diario público. Los fijados aparecen primero en la web.', manage ? `<button class="btn btn-ghost btn-sm" data-act="cleanup">${icon('broom')}Limpiar imágenes</button><button class="btn btn-accent btn-sm" data-act="new">${icon('plus')}Nuevo anuncio</button>` : '')}
      <div class="toolbar">${searchBox('ann-q', 'Buscar anuncios…')}
        <select class="input" id="ann-cat" style="max-width:200px"><option value="">Todas las categorías</option>${cats.map((c) => `<option>${esc(c)}</option>`).join('')}</select>
      </div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Anuncio</th><th class="hide-sm">Categoría</th><th class="hide-sm">Publicado</th><th class="num">Visitas</th><th class="actions"></th></tr></thead><tbody id="ann-rows"></tbody></table></div>`;
    const rows = view.querySelector('#ann-rows');
    const q = view.querySelector('#ann-q');
    const cat = view.querySelector('#ann-cat');
    function draw() {
      const needle = norm(q.value.trim());
      const list = annCache.filter((a) => (!cat.value || (a.category || 'Anuncio') === cat.value) && (!needle || norm(a.title + ' ' + a.slug).includes(needle)));
      rows.innerHTML = list.length
        ? list
            .map(
              (a) => `<tr class="${manage ? 'clickable' : ''}" data-id="${a.id}">
            <td><div class="cell-title">${a.hero_image_url ? `<img class="thumb" src="${esc(a.hero_image_url)}" alt="" loading="lazy">` : '<span class="thumb thumb-ph">DX</span>'}<div><b>${esc(a.title)}</b><small>/anuncios/${esc(a.slug || '')}</small></div></div></td>
            <td class="hide-sm"><span class="badge badge-accent">${esc(a.category || 'Anuncio')}</span></td>
            <td class="hide-sm muted" title="${esc(DX.formatDate(a.created_at))}">${esc(DX.relTime(a.created_at))}</td>
            <td class="num">${num(a.views)}</td>
            <td class="actions">
              ${manage ? `<button class="icon-btn" data-edit="${a.id}" title="Editar" aria-label="Editar ${esc(a.title)}">${icon('edit')}</button>` : ''}
              ${manage ? `<button class="icon-btn" data-pin="${a.id}" aria-pressed="${a.pinned ? 'true' : 'false'}" title="${a.pinned ? 'Quitar de fijados' : 'Fijar'}">${icon('pin')}</button>` : ''}
              ${a.slug ? `<a class="icon-btn" href="/anuncios/${encodeURIComponent(a.slug)}" target="_blank" rel="noopener" title="Ver en la web">${icon('ext')}</a>` : ''}
              ${manage ? `<button class="icon-btn danger" data-del="${a.id}" title="Eliminar">${icon('trash')}</button>` : ''}
            </td></tr>`
            )
            .join('')
        : emptyRow(5, annCache.length ? 'Ningún anuncio coincide con el filtro.' : 'Todavía no hay anuncios.');
    }
    q.addEventListener('input', draw);
    cat.addEventListener('change', draw);
    draw();
    rows.addEventListener('click', async (e) => {
      const pin = e.target.closest('[data-pin]');
      const del = e.target.closest('[data-del]');
      if (e.target.closest('a')) return;
      if (pin) {
        const a = annCache.find((x) => x.id === Number(pin.dataset.pin));
        try {
          await api(`/api/admin/announcements/${a.id}`, { method: 'PATCH', body: annPayload(a, { pinned: !a.pinned }) });
          a.pinned = a.pinned ? 0 : 1;
          DX.toast(a.pinned ? 'Anuncio fijado.' : 'Anuncio desfijado.');
          renderAnnouncements(view, alive);
        } catch (err) {
          DX.toast(err.message, 'error');
        }
        return;
      }
      if (del) {
        const a = annCache.find((x) => x.id === Number(del.dataset.del));
        if (!(await DX.confirm(`Se eliminará "${a.title}" de la web. No se puede deshacer.`, { title: '¿Eliminar anuncio?' }))) return;
        try {
          await api(`/api/admin/announcements/${a.id}`, { method: 'DELETE' });
          DX.toast('Anuncio eliminado.');
          renderAnnouncements(view, alive);
        } catch (err) {
          DX.toast(err.message, 'error');
        }
        return;
      }
      const tr = e.target.closest('[data-edit]') || e.target.closest('tr[data-id]');
      if (tr && manage) openAnnouncement(annCache.find((x) => x.id === Number(tr.dataset.edit || tr.dataset.id)));
    });
    const act = view.querySelector('.view-actions');
    act.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'new') openAnnouncement(null);
      if (b.dataset.act === 'cleanup') cleanupMedia();
    });
  }

  function annPayload(a, over) {
    return Object.assign(
      { title: a.title, slug: a.slug || '', category: a.category || '', excerpt: a.excerpt || '', hero_image_url: a.hero_image_url || null, pinned: !!a.pinned, body: a.body || '' },
      over || {}
    );
  }

  async function cleanupMedia() {
    try {
      const dry = await api('/api/admin/media/cleanup?dry=1', { method: 'POST' });
      if (!dry.deletedCount) {
        DX.toast('No hay imágenes huérfanas: todo lo subido se está usando.', 'info');
        return;
      }
      const ok = await DX.confirm(`Hay ${dry.deletedCount} imagen(es) subidas que ya no usa ningún anuncio (se conservan ${dry.keptCount}). ¿Borrarlas del almacenamiento?`, { title: 'Limpiar imágenes', okLabel: 'Borrar' });
      if (!ok) return;
      const res = await api('/api/admin/media/cleanup', { method: 'POST' });
      DX.toast(`${res.deletedCount} imagen(es) eliminadas.`);
    } catch (err) {
      DX.toast(err.message, 'error');
    }
  }

  async function uploadMedia(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await api('/api/admin/media', { method: 'POST', form: fd });
    return res.url;
  }

  function openAnnouncement(a) {
    const isEdit = !!a;
    const cats = [...new Set(annCache.map((x) => x.category || 'Anuncio'))];
    let heroUrl = (a && a.hero_image_url) || null;
    let slugTouched = isEdit;
    let quill = null;
    const d = drawer({
      title: isEdit ? 'Editar anuncio' : 'Nuevo anuncio',
      subtitle: isEdit ? (a.slug ? `/anuncios/${a.slug}` : 'Sin URL todavía') : 'Se publica en cuanto guardes.',
      wide: true,
      saveLabel: isEdit ? 'Guardar cambios' : 'Publicar',
      body: `
        <div class="field"><label for="f-title">Título</label><input id="f-title" name="title" type="text" maxlength="140" required value="${esc(a ? a.title : '')}"></div>
        <div class="field-row-2">
          <div class="field"><label for="f-slug">Slug (URL)</label><input id="f-slug" name="slug" type="text" maxlength="120" value="${esc(a ? a.slug || '' : '')}" placeholder="se genera desde el título"><span class="field-hint">Cambiarlo rompe los enlaces ya compartidos.</span></div>
          <div class="field"><label for="f-cat">Categoría</label><input id="f-cat" name="category" type="text" maxlength="40" list="cat-list" value="${esc(a ? a.category || '' : '')}" placeholder="Anuncio"><datalist id="cat-list">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></div>
        </div>
        <div class="field"><label for="f-ex">Extracto</label><textarea id="f-ex" name="excerpt" maxlength="220" style="min-height:70px;font-family:var(--f-body)">${esc(a ? a.excerpt || '' : '')}</textarea><span class="field-hint" data-count></span></div>
        <div class="field"><span class="field-label">Portada</span>
          <div class="upload" id="hero-box"></div>
        </div>
        <div class="field"><label class="check-inline"><input type="checkbox" name="pinned" ${a && a.pinned ? 'checked' : ''}> Fijar arriba en la web</label></div>
        <div class="field"><span class="field-label">Cuerpo</span><div id="f-body"></div><span class="field-hint">Pega o arrastra imágenes: se suben solas. Máximo 50.000 caracteres.</span></div>`,
      onOpen(dr) {
        const f = dr.form;
        const title = f.elements.title;
        const slug = f.elements.slug;
        title.addEventListener('input', () => {
          if (!slugTouched) slug.value = slugify(title.value);
        });
        slug.addEventListener('input', () => (slugTouched = true));
        charCounter(f.elements.excerpt, 220);
        const box = f.querySelector('#hero-box');
        function drawHero(status) {
          box.innerHTML = `${heroUrl ? `<img src="${esc(heroUrl)}" alt="Portada">` : '<div class="upload-ph">Sin portada</div>'}
            <div><input type="file" class="file-input" accept="image/png,image/jpeg,image/webp,image/gif">
            ${heroUrl ? `<button type="button" class="btn btn-ghost btn-sm" data-rm style="margin-top:8px">Quitar portada</button>` : ''}</div>
            <span class="field-hint">${esc(status || 'PNG, JPG, WEBP o GIF, hasta 5 MB. Recomendado 1600×900.')}</span>`;
          box.querySelector('input').addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            drawHero('Subiendo…');
            try {
              heroUrl = await uploadMedia(file);
              dr.markDirty();
              drawHero('Portada subida.');
            } catch (err) {
              drawHero('');
              dr.setError(err.message);
            }
          });
          const rm = box.querySelector('[data-rm]');
          if (rm)
            rm.addEventListener('click', () => {
              heroUrl = null;
              dr.markDirty();
              drawHero();
            });
        }
        drawHero();
        if (!window.Quill) {
          f.querySelector('#f-body').innerHTML = '<div class="banner banner-danger">No se pudo cargar el editor. Recarga la página.</div>';
          return;
        }
        quill = new Quill(f.querySelector('#f-body'), {
          theme: 'snow',
          placeholder: 'Escribe el anuncio…',
          modules: {
            toolbar: {
              container: [[{ header: [2, 3, false] }], ['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['blockquote', 'link', 'image'], ['clean']],
              handlers: {
                image() {
                  const inp = document.createElement('input');
                  inp.type = 'file';
                  inp.accept = 'image/png,image/jpeg,image/webp,image/gif';
                  inp.addEventListener('change', () => inp.files[0] && insertImage(inp.files[0]));
                  inp.click();
                },
              },
            },
          },
        });
        if (a && a.body) quill.clipboard.dangerouslyPasteHTML(a.body, 'silent');
        quill.on('text-change', (delta, old, source) => source === 'user' && dr.markDirty());
        async function insertImage(file) {
          const range = quill.getSelection(true) || { index: quill.getLength() };
          try {
            const url = await uploadMedia(file);
            quill.insertEmbed(range.index, 'image', url, 'user');
            quill.setSelection(range.index + 1);
          } catch (err) {
            DX.toast(err.message, 'error');
          }
        }
        // Pasted/dropped images would otherwise be embedded as huge base64
        // strings; route them through the R2 upload instead.
        const intercept = (e) => {
          const files = (e.clipboardData || e.dataTransfer || {}).files;
          const img = files && Array.from(files).find((x) => x.type.startsWith('image/'));
          if (!img) return;
          e.preventDefault();
          e.stopPropagation();
          insertImage(img);
        };
        quill.root.addEventListener('paste', intercept, true);
        quill.root.addEventListener('drop', intercept, true);
      },
      async onSave(dr) {
        const f = dr.form;
        if (!quill) throw new Error('El editor no está disponible.');
        // getSemanticHTML() turns Quill 2's internal <ol><li data-list="bullet">
        // into real <ul>/<ol>; the server strips data-* attributes, so the raw
        // editor HTML would publish every bullet list as a numbered one.
        const html = typeof quill.getSemanticHTML === 'function' ? quill.getSemanticHTML() : quill.root.innerHTML;
        const payload = {
          title: f.elements.title.value.trim(),
          slug: f.elements.slug.value.trim(),
          category: f.elements.category.value.trim(),
          excerpt: f.elements.excerpt.value.trim(),
          hero_image_url: heroUrl,
          pinned: f.elements.pinned.checked,
          body: window.DOMPurify ? DOMPurify.sanitize(html) : html,
        };
        if (!payload.title) throw new Error('Falta el título.');
        if (quill.getText().trim().length === 0 && !/<img/i.test(html)) throw new Error('El cuerpo está vacío.');
        if (payload.body.length > 50000) throw new Error(`El cuerpo es demasiado largo (${payload.body.length.toLocaleString('es-ES')} caracteres, máx. 50.000).`);
        if (isEdit) await api(`/api/admin/announcements/${a.id}`, { method: 'PATCH', body: payload });
        else await api('/api/admin/announcements', { method: 'POST', body: payload });
        DX.toast(isEdit ? 'Anuncio actualizado.' : 'Anuncio publicado.');
        app.rerender();
      },
      onDelete: isEdit
        ? async () => {
            await api(`/api/admin/announcements/${a.id}`, { method: 'DELETE' });
            DX.toast('Anuncio eliminado.');
            app.rerender();
          }
        : null,
      deleteTitle: '¿Eliminar anuncio?',
    });
    return d;
  }

  /* =====================================================================
     WIKI
     ===================================================================== */
  let wikiCache = [];
  async function renderWiki(view, alive) {
    const data = await api('/api/admin/wiki');
    if (!alive()) return;
    wikiCache = data.pages || [];
    app.setCount('wiki', wikiCache.length);
    const manage = can('wiki.manage');
    view.innerHTML = `
      ${head('Wiki', 'Páginas en Markdown agrupadas por categoría. Admite callouts: <code>&gt; [!TIP]</code>, <code>[!WARNING]</code>, <code>[!NOTE]</code>, <code>[!DANGER]</code>.', manage ? `<button class="btn btn-accent btn-sm" data-act="new">${icon('plus')}Nueva página</button>` : '')}
      <div class="toolbar">${searchBox('wiki-q', 'Buscar páginas…')}</div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Página</th><th>Categoría</th><th class="num hide-sm">Orden</th><th class="hide-sm">Actualizada</th><th class="actions"></th></tr></thead><tbody id="wiki-rows"></tbody></table></div>`;
    const rows = view.querySelector('#wiki-rows');
    const q = view.querySelector('#wiki-q');
    function draw() {
      const needle = norm(q.value.trim());
      const list = wikiCache.filter((p) => !needle || norm(p.title + ' ' + p.slug + ' ' + p.category).includes(needle));
      rows.innerHTML = list.length
        ? list
            .map(
              (p) => `<tr class="${manage ? 'clickable' : ''}" data-id="${p.id}">
          <td><div class="cell-title"><div><b>${esc(p.title)}</b><small>?p=${esc(p.slug)}</small></div></div></td>
          <td><span class="badge">${esc(p.category || 'General')}</span></td>
          <td class="num hide-sm">${Number(p.position) || 0}</td>
          <td class="muted hide-sm" title="${esc(DX.formatDate(p.updated_at))}">${esc(DX.relTime(p.updated_at))}</td>
          <td class="actions"><a class="icon-btn" href="/wiki.html?p=${encodeURIComponent(p.slug)}" target="_blank" rel="noopener" title="Ver en la web">${icon('ext')}</a>
          ${manage ? `<button class="icon-btn" data-edit="${p.id}" title="Editar" aria-label="Editar ${esc(p.title)}">${icon('edit')}</button><button class="icon-btn danger" data-del="${p.id}" title="Eliminar">${icon('trash')}</button>` : ''}</td></tr>`
            )
            .join('')
        : emptyRow(5, wikiCache.length ? 'Ninguna página coincide.' : 'Todavía no hay páginas.');
    }
    q.addEventListener('input', draw);
    draw();
    rows.addEventListener('click', async (e) => {
      if (e.target.closest('a')) return;
      const del = e.target.closest('[data-del]');
      if (del) {
        const p = wikiCache.find((x) => x.id === Number(del.dataset.del));
        if (!(await DX.confirm(`Se eliminará "${p.title}" de la wiki pública.`, { title: '¿Eliminar página?' }))) return;
        try {
          await api(`/api/admin/wiki/${p.id}`, { method: 'DELETE' });
          DX.toast('Página eliminada.');
          renderWiki(view, alive);
        } catch (err) {
          DX.toast(err.message, 'error');
        }
        return;
      }
      const tr = e.target.closest('[data-edit]') || e.target.closest('tr[data-id]');
      if (tr && manage) openWikiPage(wikiCache.find((x) => x.id === Number(tr.dataset.edit || tr.dataset.id)));
    });
    const newBtn = view.querySelector('[data-act="new"]');
    if (newBtn) newBtn.addEventListener('click', () => openWikiPage(null));
  }

  function openWikiPage(p) {
    const isEdit = !!p;
    const cats = [...new Set(wikiCache.map((x) => x.category || 'General'))];
    let slugTouched = isEdit;
    drawer({
      title: isEdit ? 'Editar página' : 'Nueva página',
      subtitle: isEdit ? `wiki.html?p=${p.slug}` : '',
      wide: true,
      body: `
        <div class="field-row-2">
          <div class="field"><label for="w-title">Título</label><input id="w-title" name="title" type="text" maxlength="120" value="${esc(p ? p.title : '')}"></div>
          <div class="field"><label for="w-slug">Slug</label><input id="w-slug" name="slug" type="text" maxlength="60" value="${esc(p ? p.slug : '')}" placeholder="reglas-generales"></div>
        </div>
        <div class="field-row-2">
          <div class="field"><label for="w-cat">Categoría</label><input id="w-cat" name="category" type="text" maxlength="60" list="wcat" value="${esc(p ? p.category || '' : '')}" placeholder="General"><datalist id="wcat">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></div>
          <div class="field"><label for="w-pos">Orden dentro de la categoría</label><input id="w-pos" name="position" type="number" value="${p ? Number(p.position) || 0 : 0}"></div>
        </div>
        <div class="field"><span class="field-label">Contenido (Markdown)</span>
          <div class="md-editor"><div>${MD_TOOLBAR}<textarea name="content" spellcheck="true">${esc(p ? p.content || '' : '')}</textarea></div><div class="md-preview md-content" aria-label="Vista previa"></div></div>
        </div>`,
      onOpen(dr) {
        const f = dr.form;
        f.elements.title.addEventListener('input', () => {
          if (!slugTouched) f.elements.slug.value = slugify(f.elements.title.value);
        });
        f.elements.slug.addEventListener('input', () => (slugTouched = true));
        mdEditor(f.elements.content, f.querySelector('.md-preview'));
      },
      async onSave(dr) {
        const f = dr.form;
        const payload = {
          title: f.elements.title.value.trim(),
          slug: f.elements.slug.value.trim(),
          category: f.elements.category.value.trim(),
          position: Number(f.elements.position.value) || 0,
          content: f.elements.content.value,
        };
        if (!payload.title) throw new Error('Falta el título.');
        if (!/^[a-z0-9-]+$/.test(payload.slug)) throw new Error('Slug inválido: solo minúsculas, números y guiones.');
        if (isEdit) await api(`/api/admin/wiki/${p.id}`, { method: 'PATCH', body: payload });
        else await api('/api/admin/wiki', { method: 'POST', body: payload });
        DX.toast(isEdit ? 'Página actualizada.' : 'Página creada.');
        app.rerender();
      },
      onDelete: isEdit
        ? async () => {
            await api(`/api/admin/wiki/${p.id}`, { method: 'DELETE' });
            DX.toast('Página eliminada.');
            app.rerender();
          }
        : null,
      deleteTitle: '¿Eliminar página?',
    });
  }

  /* =====================================================================
     EQUIPO
     ===================================================================== */
  let teamCache = [];
  const TEAM_LABEL = { staff: 'Staff', dev: 'Desarrollo' };
  async function renderTeam(view, alive) {
    const data = await api('/api/admin/team');
    if (!alive()) return;
    const TEAM_ORDER = { staff: 0, dev: 1 };
    teamCache = (data.members || [])
      .slice()
      .sort((a, b) => (TEAM_ORDER[a.team] ?? 9) - (TEAM_ORDER[b.team] ?? 9) || (Number(b.position) || 0) - (Number(a.position) || 0));
    app.setCount('equipo', teamCache.length);
    const manage = can('team.manage');
    view.innerHTML = `
      ${head('Equipo', 'Tarjetas de la sección "El equipo" de la home. Dentro de cada equipo, el orden va de mayor a menor posición.', manage ? `<button class="btn btn-accent btn-sm" data-act="new">${icon('plus')}Añadir miembro</button>` : '')}
      <div class="table-wrap"><table class="table"><thead><tr><th>Miembro</th><th>Rango</th><th class="hide-sm">Función</th><th>Equipo</th><th class="num hide-sm">Posición</th><th class="actions"></th></tr></thead><tbody>
      ${
        teamCache.length
          ? teamCache
              .map((m) => {
                const c = DX.safeColor(m.rank_color);
                return `<tr class="${manage ? 'clickable' : ''}" data-id="${m.id}">
            <td><div class="cell-title"><img class="face" src="${esc(face(m, 64))}" alt="" loading="lazy"><div><b>${esc(m.mc_nick)}</b><small>${m.mc_uuid ? 'UUID resuelto' : 'sin UUID (skin por nick)'}</small></div></div></td>
            <td><span class="role-pill" style="color:${c}"><span class="swatch" style="background:${c}"></span>${esc(m.rank_label)}</span></td>
            <td class="muted hide-sm">${esc(m.function_text || '')}</td>
            <td><span class="badge">${esc(TEAM_LABEL[m.team] || m.team)}</span></td>
            <td class="num hide-sm">${Number(m.position) || 0}</td>
            <td class="actions">${manage ? `<button class="icon-btn" data-edit="${m.id}" title="Editar" aria-label="Editar ${esc(m.mc_nick)}">${icon('edit')}</button><button class="icon-btn danger" data-del="${m.id}" title="Eliminar">${icon('trash')}</button>` : ''}</td></tr>`;
              })
              .join('')
          : emptyRow(6, 'Todavía no hay miembros.')
      }</tbody></table></div>`;
    view.querySelector('tbody').addEventListener('click', async (e) => {
      const del = e.target.closest('[data-del]');
      if (del) {
        const m = teamCache.find((x) => x.id === Number(del.dataset.del));
        if (!(await DX.confirm(`${m.mc_nick} dejará de aparecer en la web.`, { title: '¿Quitar del equipo?', okLabel: 'Quitar' }))) return;
        try {
          await api(`/api/admin/team/${m.id}`, { method: 'DELETE' });
          DX.toast('Miembro eliminado.');
          renderTeam(view, alive);
        } catch (err) {
          DX.toast(err.message, 'error');
        }
        return;
      }
      const tr = e.target.closest('[data-edit]') || e.target.closest('tr[data-id]');
      if (tr && manage) openMember(teamCache.find((x) => x.id === Number(tr.dataset.edit || tr.dataset.id)));
    });
    const nb = view.querySelector('[data-act="new"]');
    if (nb) nb.addEventListener('click', () => openMember(null));
  }

  function openMember(m) {
    const isEdit = !!m;
    const color = m ? hex6(m.rank_color) : '#37d6b4';
    drawer({
      title: isEdit ? `Editar ${m.mc_nick}` : 'Añadir miembro',
      body: `
        <div class="field" style="flex-direction:row;align-items:flex-end;gap:14px">
          <div style="flex:1" class="field" ><label for="t-nick">Nick de Minecraft</label><input id="t-nick" name="mc_nick" type="text" maxlength="16" value="${esc(m ? m.mc_nick : '')}" placeholder="Steve123" autocomplete="off"><span class="field-hint">Se resuelve su UUID con Mojang al guardar para mostrar la skin actual.</span></div>
          <img class="face" id="t-face" style="width:64px;height:64px;border-radius:10px" src="${m ? esc(face(m, 128)) : ''}" alt="" ${m ? '' : 'hidden'}>
        </div>
        <div class="field-row-2">
          <div class="field"><label for="t-rank">Rango</label><input id="t-rank" name="rank_label" type="text" maxlength="40" value="${esc(m ? m.rank_label : '')}" placeholder="Administrador"></div>
          <div class="field"><label for="t-color">Color del rango</label><div style="display:flex;gap:10px;align-items:center"><input id="t-color" name="rank_color" type="color" value="${esc(color)}"><code id="t-hex" class="mono" style="font-size:12px;color:var(--text-dim)">${esc(color)}</code></div></div>
        </div>
        <div class="field"><label for="t-fn">Función</label><input id="t-fn" name="function_text" type="text" maxlength="140" value="${esc(m ? m.function_text || '' : '')}" placeholder="Organización general"><span class="field-hint" data-count></span></div>
        <div class="field-row-2">
          <div class="field"><label for="t-team">Equipo</label><select id="t-team" name="team"><option value="staff" ${!m || m.team === 'staff' ? 'selected' : ''}>Staff</option><option value="dev" ${m && m.team === 'dev' ? 'selected' : ''}>Desarrollo</option></select></div>
          <div class="field"><label for="t-pos">Posición (mayor = antes)</label><input id="t-pos" name="position" type="number" value="${m ? Number(m.position) || 0 : 0}"></div>
        </div>`,
      onOpen(dr) {
        const f = dr.form;
        const img = f.querySelector('#t-face');
        let t = null;
        f.elements.mc_nick.addEventListener('input', () => {
          clearTimeout(t);
          t = setTimeout(() => {
            const nick = f.elements.mc_nick.value.trim();
            img.hidden = !nick;
            if (nick) img.src = `https://vzge.me/face/128/${encodeURIComponent(nick)}`;
          }, 350);
        });
        f.elements.rank_color.addEventListener('input', () => (f.querySelector('#t-hex').textContent = f.elements.rank_color.value));
        charCounter(f.elements.function_text, 140);
      },
      async onSave(dr) {
        const f = dr.form;
        const payload = {
          mc_nick: f.elements.mc_nick.value.trim(),
          rank_label: f.elements.rank_label.value.trim(),
          rank_color: f.elements.rank_color.value,
          function_text: f.elements.function_text.value.trim(),
          team: f.elements.team.value,
          position: Number(f.elements.position.value) || 0,
        };
        if (!/^[A-Za-z0-9_]{1,16}$/.test(payload.mc_nick)) throw new Error('Nick de Minecraft inválido (letras, números y _; máx. 16).');
        if (!payload.rank_label) throw new Error('Falta el rango.');
        if (isEdit) await api(`/api/admin/team/${m.id}`, { method: 'PATCH', body: payload });
        else await api('/api/admin/team', { method: 'POST', body: payload });
        DX.toast(isEdit ? 'Miembro actualizado.' : 'Miembro añadido.');
        app.rerender();
      },
      onDelete: isEdit
        ? async () => {
            await api(`/api/admin/team/${m.id}`, { method: 'DELETE' });
            DX.toast('Miembro eliminado.');
            app.rerender();
          }
        : null,
      deleteTitle: '¿Quitar del equipo?',
    });
  }

  /* =====================================================================
     SANCIONES
     ===================================================================== */
  const SANCTION_TYPES = { ban: 'Ban', mute: 'Mute', kick: 'Kick', warn: 'Warn', other: 'Otro' };
  const SANCTION_BADGE = { ban: 'badge-danger', mute: 'badge-warn', kick: 'badge-warn', warn: 'badge-accent', other: '' };
  async function renderSanctions(view, alive) {
    const data = await api('/api/staff/sanctions');
    if (!alive()) return;
    const list = data.sanctions || [];
    app.setCount('sanciones', list.length);
    const manage = can('sanctions.manage');
    view.innerHTML = `
      ${head('Sanciones', 'Registro interno de sanciones con pruebas. Las pruebas solo son visibles para el staff.', `<button class="btn btn-accent btn-sm" data-act="new">${icon('plus')}Registrar sanción</button>`)}
      <div class="toolbar">${searchBox('s-q', 'Buscar por jugador o motivo…')}
        <div class="seg" id="s-type" role="group" aria-label="Tipo"><button type="button" data-t="" aria-pressed="true">Todas</button>${Object.entries(SANCTION_TYPES)
          .map(([k, v]) => `<button type="button" data-t="${k}" aria-pressed="false">${v}</button>`)
          .join('')}</div>
      </div>
      <div id="s-list"></div>`;
    const listEl = view.querySelector('#s-list');
    const q = view.querySelector('#s-q');
    let type = '';
    function evidenceHtml(ev) {
      const url = `/api/staff/evidence/${Number(ev.id)}`;
      const t = ev.content_type || '';
      if (t.startsWith('image/')) return `<a href="${url}" target="_blank" rel="noopener" title="${esc(ev.filename || '')}"><img src="${url}" alt="" loading="lazy"></a>`;
      if (t.startsWith('video/')) return `<video src="${url}" controls preload="metadata"></video>`;
      return `<a class="file" href="${url}" target="_blank" rel="noopener">${esc(ev.filename || 'archivo')}</a>`;
    }
    function draw() {
      const needle = norm(q.value.trim());
      const items = list.filter((s) => (!type || s.type === type) && (!needle || norm(s.target_nick + ' ' + s.reason).includes(needle)));
      listEl.innerHTML = items.length
        ? items
            .map(
              (s) => `<article class="sanction">
          <div class="sanction-head"><b>${esc(s.target_nick)}</b><span class="badge ${SANCTION_BADGE[s.type] || ''}">${esc(SANCTION_TYPES[s.type] || s.type)}</span>
            <span class="muted">por ${esc(s.staff_name || s.staff_id || 'desconocido')} · <span title="${esc(DX.formatDate(s.created_at))}">${esc(DX.relTime(s.created_at))}</span></span>
            ${manage ? `<button class="icon-btn danger" data-del="${s.id}" title="Eliminar">${icon('trash')}</button>` : ''}</div>
          ${s.reason ? `<p>${esc(s.reason)}</p>` : ''}
          ${(s.evidence || []).length ? `<div class="evidence">${s.evidence.map(evidenceHtml).join('')}</div>` : ''}
        </article>`
            )
            .join('')
        : `<div class="empty-state">${list.length ? 'Ninguna sanción coincide.' : 'Todavía no hay sanciones registradas.'}</div>`;
    }
    q.addEventListener('input', draw);
    view.querySelector('#s-type').addEventListener('click', (e) => {
      const b = e.target.closest('[data-t]');
      if (!b) return;
      type = b.dataset.t;
      view.querySelectorAll('#s-type button').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      draw();
    });
    listEl.addEventListener('click', async (e) => {
      const del = e.target.closest('[data-del]');
      if (!del) return;
      if (!(await DX.confirm('Se borrará la sanción y todas sus pruebas.', { title: '¿Eliminar sanción?' }))) return;
      try {
        await api(`/api/staff/sanctions/${del.dataset.del}`, { method: 'DELETE' });
        DX.toast('Sanción eliminada.');
        renderSanctions(view, alive);
      } catch (err) {
        DX.toast(err.message, 'error');
      }
    });
    view.querySelector('[data-act="new"]').addEventListener('click', openSanction);
    draw();
  }

  function openSanction() {
    drawer({
      title: 'Registrar sanción',
      saveLabel: 'Registrar',
      body: `
        <div class="field-row-2">
          <div class="field"><label for="s-nick">Nick del jugador</label><input id="s-nick" name="target_nick" type="text" maxlength="32" autocomplete="off"></div>
          <div class="field"><label for="s-type2">Tipo</label><select id="s-type2" name="type">${Object.entries(SANCTION_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
        </div>
        <div class="field"><label for="s-reason">Motivo</label><textarea id="s-reason" name="reason" maxlength="2000" style="font-family:var(--f-body)"></textarea><span class="field-hint" data-count></span></div>
        <div class="field"><label for="s-files">Pruebas (opcional)</label><input id="s-files" name="files" type="file" class="file-input" multiple accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"><span class="field-hint">Hasta 6 archivos PNG, JPG, WEBP, GIF, MP4 o WEBM, de 8 MB como máximo cada uno.</span></div>`,
      onOpen(dr) {
        charCounter(dr.form.elements.reason, 2000);
      },
      async onSave(dr) {
        const f = dr.form;
        const nick = f.elements.target_nick.value.trim();
        const reason = f.elements.reason.value.trim();
        const files = Array.from(f.elements.files.files || []);
        if (!nick) throw new Error('Falta el nick del jugador.');
        if (!reason) throw new Error('Explica el motivo.');
        if (files.length > 6) throw new Error('Máximo 6 archivos.');
        // Checked before sending: the sanction row is created first and a
        // rejected file afterwards would leave it without its evidence.
        const OK_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
        const bad = files.find((x) => !OK_TYPES.includes(x.type) || x.size > 8 * 1024 * 1024);
        if (bad) throw new Error(`"${bad.name}" no vale: solo PNG, JPG, WEBP, GIF, MP4 o WEBM de hasta 8 MB.`);
        const fd = new FormData();
        fd.append('target_nick', nick);
        fd.append('type', f.elements.type.value);
        fd.append('reason', reason);
        files.forEach((file) => fd.append('files', file));
        const res = await api('/api/staff/sanctions', { method: 'POST', form: fd });
        if (res && res.fileErrors && res.fileErrors.length) DX.toast('Sanción registrada, pero algunos archivos fallaron: ' + res.fileErrors.map((x) => `${x.filename} (${x.error})`).join(', '), 'error');
        else DX.toast('Sanción registrada.');
        app.rerender();
      },
    });
  }

  /* =====================================================================
     ESTADÍSTICAS
     ===================================================================== */
  let statsRange = '7d';
  let statsMetric = 'views';
  let statsSeq = 0;
  let statsData = null; // { range, data } of the last response
  async function renderStats(view, alive) {
    const my = ++statsSeq;
    const data = statsData && statsData.range === statsRange ? statsData.data : await api(`/api/admin/stats?range=${encodeURIComponent(statsRange)}`);
    // a slower, older request must never overwrite a newer range
    if (!alive() || my !== statsSeq) return;
    statsData = { range: statsRange, data };
    const t = data.totals || {};
    const p = data.previous || {};
    const delta = (c, prev) => {
      c = Number(c) || 0;
      prev = Number(prev) || 0;
      if (!prev) return c ? '<span class="kpi-delta up">Nuevo</span>' : '<span class="kpi-delta">Sin datos previos</span>';
      const d = ((c - prev) / prev) * 100;
      return `<span class="kpi-delta ${d > 0.5 ? 'up' : d < -0.5 ? 'down' : ''}">${d > 0 ? '+' : ''}${d.toFixed(1)}% vs. periodo anterior</span>`;
    };
    const ranges = [['today', 'Hoy', 'D'], ['7d', '7 días', 'W'], ['30d', '30 días', 'M'], ['90d', '90 días', 'T']];
    view.innerHTML = `
      ${head('Estadísticas', 'Analítica propia sin cookies: visitantes contados con una huella anónima que rota cada día.', `<div class="seg" id="st-range">${ranges.map(([k, l, key]) => `<button type="button" data-r="${k}" aria-pressed="${k === statsRange}" title="Atajo: ${key}">${l}</button>`).join('')}</div>`)}
      <div class="kpis">
        <button type="button" class="kpi" data-m="views" aria-pressed="${statsMetric === 'views'}"><span class="kpi-label">Visitas</span><span class="kpi-value">${num(t.pageviews)}</span>${delta(t.pageviews, p.pageviews)}</button>
        <button type="button" class="kpi" data-m="uniques" aria-pressed="${statsMetric === 'uniques'}"><span class="kpi-label">Visitantes únicos</span><span class="kpi-value">${num(t.uniques)}</span>${delta(t.uniques, p.uniques)}</button>
        <div class="kpi"><span class="kpi-label">Clics registrados</span><span class="kpi-value">${num(t.clicks)}</span>${delta(t.clicks, p.clicks)}</div>
      </div>
      <section class="panel"><h2>${statsMetric === 'views' ? 'Visitas' : 'Visitantes únicos'} por día</h2><div id="st-chart"></div></section>
      <div class="grid-3">
        <section class="panel"><h2>Páginas más vistas</h2><div class="barlist" id="st-pages"></div></section>
        <section class="panel"><h2>Clics más frecuentes</h2><div class="barlist" id="st-clicks"></div></section>
        <section class="panel"><h2>Origen del tráfico</h2><div class="barlist" id="st-refs"></div></section>
        <section class="panel"><h2>Dispositivos</h2><div class="barlist" id="st-dev"></div></section>
        <section class="panel"><h2>Países</h2><div class="barlist" id="st-country"></div></section>
      </div>`;
    const dayLabel = (r) => {
      const d = DX.parseDate(r.day + ' 00:00:00');
      return d ? d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : r.day;
    };
    // The API only returns days that had traffic: fill the gaps with zeros
    // so a quiet week still reads as a week instead of two joined points.
    const span = { today: 1, '7d': 8, '30d': 31, '90d': 91 }[statsRange] || 8;
    const byDay = new Map((data.daily || []).map((r) => [r.day, r]));
    const daily = [];
    for (let i = span - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      daily.push(byDay.get(d) || { day: d, views: 0, uniques: 0 });
    }
    lineChart(view.querySelector('#st-chart'), daily, {
      key: statsMetric,
      key2: statsMetric === 'views' ? 'uniques' : null,
      label: dayLabel,
      aria: 'Visitas por día',
      tip: (r) => `<b>${esc(dayLabel(r))}</b>${num(r.views)} visitas · ${num(r.uniques)} únicos`,
      legend: statsMetric === 'views' ? '<span><i></i>Visitas</span><span><i class="l2"></i>Únicos</span>' : '',
    });
    const flag = (c) => (c && c.length === 2 ? String.fromCodePoint(...[...c.toUpperCase()].map((x) => 127397 + x.charCodeAt(0))) + ' ' : '');
    const bars = (id, rows, vk, lk, fmt) => {
      const el = view.querySelector(id);
      if (!rows || !rows.length) {
        el.innerHTML = '<p class="panel-sub">Sin datos en este periodo.</p>';
        return;
      }
      const max = Math.max(1, ...rows.map((r) => Number(r[vk]) || 0));
      el.innerHTML = rows
        .map((r) => `<div class="bar-row" style="--w:${(((Number(r[vk]) || 0) / max) * 100).toFixed(1)}%" title="${esc(r[lk] || '')}"><span>${fmt ? fmt(r[lk]) : esc(r[lk] || 'Desconocido')}</span><b>${num(r[vk])}</b></div>`)
        .join('');
    };
    bars('#st-pages', data.topPages, 'views', 'path');
    bars('#st-clicks', data.topClicks, 'clicks', 'target');
    bars('#st-refs', data.referrers, 'views', 'referrer', (v) => esc(v === 'direct' ? 'Directo / interno' : v));
    bars('#st-dev', data.devices, 'views', 'device', (v) => (v === 'mobile' ? 'Móvil' : 'Escritorio'));
    bars('#st-country', data.countries, 'views', 'country', (v) => esc(flag(v) + (v || 'Desconocido')));
    view.querySelector('#st-range').addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (!b || b.dataset.r === statsRange) return;
      statsRange = b.dataset.r;
      statsData = null;
      renderStats(view, alive);
    });
    view.querySelectorAll('[data-m]').forEach((b) =>
      b.addEventListener('click', () => {
        statsMetric = b.dataset.m;
        renderStats(view, alive);
      })
    );
  }
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || !location.hash.startsWith('#estadisticas')) return;
    if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '') || document.querySelector('.drawer, .cmdk-overlay')) return;
    const map = { d: 'today', w: '7d', m: '30d', t: '90d' };
    const r = map[e.key.toLowerCase()];
    if (!r || r === statsRange) return;
    statsRange = r;
    statsData = null;
    app.rerender();
  });

  /* =====================================================================
     USO DE RECURSOS
     ===================================================================== */
  const RESOURCE_LABELS = {
    d1_reads: ['D1 · filas leídas', 'hoy'],
    d1_writes: ['D1 · filas escritas', 'hoy'],
    kv_reads: ['KV · lecturas', 'hoy'],
    kv_writes: ['KV · escrituras', 'hoy'],
    kv_deletes: ['KV · borrados', 'hoy'],
    r2_class_a: ['R2 · operaciones clase A', 'este mes'],
    r2_class_b: ['R2 · operaciones clase B', 'este mes'],
    analytics_writes: ['Escrituras de analítica y visitas', 'hoy'],
  };
  async function renderUsage(view, alive) {
    const data = await api('/api/admin/usage');
    if (!alive()) return;
    const usage = data.usage || {};
    const entries = Object.entries(usage);
    const hot = entries.filter(([, u]) => u.limit && u.current / u.limit >= 0.8);
    view.innerHTML = `
      ${head('Uso de recursos', 'Contadores propios frente a los límites gratuitos de Cloudflare. Al llegar al límite, las peticiones que lo necesiten se bloquean en vez de empezar a cobrarse.', `<button class="btn btn-ghost btn-sm" data-act="refresh">Actualizar</button>`)}
      ${hot.length ? `<div class="banner banner-warn">${icon('gauge')}<div><b>Atención:</b> ${hot.map(([k]) => esc((RESOURCE_LABELS[k] || [k])[0])).join(', ')} por encima del 80%.</div></div>` : ''}
      ${data.note ? `<div class="banner banner-info">${icon('gauge')}<div>${esc(data.note)}</div></div>` : ''}
      <div class="grid-2">${entries
        .map(([k, u]) => {
          const pct = u.limit ? Math.min(100, (u.current / u.limit) * 100) : 0;
          const cls = pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : '';
          const [label, period] = RESOURCE_LABELS[k] || [k, ''];
          return `<section class="panel meter"><div class="meter-head"><span>${esc(label)} <small class="muted">(${esc(period)})</small></span><b>${num(u.current)} / ${num(u.limit)}</b></div>
            <div class="meter-bar"><i class="${cls}" style="--w:${pct.toFixed(2)}%"></i></div>
            <span class="panel-sub">${pct.toFixed(1)}% usado${u.current >= u.limit - 1 ? ' · <b style="color:var(--danger)">BLOQUEADO</b>' : ''}</span></section>`;
        })
        .join('')}</div>`;
    view.querySelector('[data-act="refresh"]').addEventListener('click', () => app.rerender());
  }

  /* =====================================================================
     RANGOS Y PERMISOS
     ===================================================================== */
  let rolesCache = [];
  let permsCache = [];
  const PERM_GROUPS = { panel: 'Panel', wiki: 'Wiki', announcements: 'Anuncios', team: 'Equipo', sanctions: 'Sanciones', devzone: 'Dev Zone' };
  async function renderRoles(view, alive) {
    const [r, p] = await Promise.all([api('/api/admin/roles'), permsCache.length ? { permissions: permsCache } : api('/api/admin/permissions')]);
    if (!alive()) return;
    rolesCache = r.roles || [];
    permsCache = p.permissions || [];
    const manage = can('panel.manage_roles');
    view.innerHTML = `
      ${head('Rangos y permisos', 'Owner y Co-Owner tienen todos los permisos y no se pueden editar. Solo puedes gestionar rangos por debajo del tuyo y conceder permisos que tú tengas.', manage ? `<button class="btn btn-accent btn-sm" data-act="new">${icon('plus')}Crear rango</button>` : '')}
      <div class="table-wrap" style="margin-bottom:22px"><table class="table"><thead><tr><th>Rango</th><th class="num">Posición</th><th>Permisos</th><th class="actions"></th></tr></thead><tbody>
      ${rolesCache
        .map(
          (x) => `<tr class="${manage && canEditRole(x) ? 'clickable' : ''}" data-id="${x.id}">
          <td><div class="cell-title"><span class="swatch" style="background:${DX.safeColor(x.color)};width:12px;height:12px"></span><b>${esc(x.name)}</b>${x.is_locked ? '<span class="badge">Fijo</span>' : ''}</div></td>
          <td class="num">${Number(x.position) || 0}</td>
          <td class="muted">${x.is_locked ? 'Todos' : x.permissions.length ? x.permissions.map(esc).join(', ') : 'Ninguno'}</td>
          <td class="actions">${manage && canEditRole(x) ? `<button class="icon-btn" data-edit="${x.id}" title="Editar" aria-label="Editar ${esc(x.name)}">${icon('edit')}</button><button class="icon-btn danger" data-del="${x.id}" title="Eliminar">${icon('trash')}</button>` : ''}</td></tr>`
        )
        .join('')}</tbody></table></div>
      <section class="panel">
        <h2>Asignar rangos a usuarios</h2>
        <div class="toolbar">${searchBox('u-q', 'Nombre de usuario o ID de Discord…')}<button class="btn btn-ghost btn-sm" data-act="search">Buscar</button></div>
        <div id="u-results"><p class="panel-sub">Busca a alguien para ver y cambiar sus rangos. Puedes pegar el ID de Discord de alguien que aún no ha iniciado sesión.</p></div>
      </section>`;
    view.querySelector('tbody').addEventListener('click', async (e) => {
      const del = e.target.closest('[data-del]');
      if (del) {
        const role = rolesCache.find((x) => x.id === Number(del.dataset.del));
        if (!(await DX.confirm(`Quien tenga "${role.name}" perderá sus permisos.`, { title: '¿Eliminar rango?' }))) return;
        try {
          await api(`/api/admin/roles/${role.id}`, { method: 'DELETE' });
          DX.toast('Rango eliminado.');
          renderRoles(view, alive);
        } catch (err) {
          DX.toast(err.message, 'error');
        }
        return;
      }
      const tr = e.target.closest('[data-edit]') || e.target.closest('tr[data-id]');
      if (!tr || !manage) return;
      const role = rolesCache.find((x) => x.id === Number(tr.dataset.edit || tr.dataset.id));
      if (role && canEditRole(role)) openRole(role);
    });
    const nb = view.querySelector('[data-act="new"]');
    if (nb) nb.addEventListener('click', () => openRole(null));
    const input = view.querySelector('#u-q');
    const go = () => searchUsers(view, input.value.trim());
    view.querySelector('[data-act="search"]').addEventListener('click', go);
    input.addEventListener('keydown', (e) => e.key === 'Enter' && go());
  }

  async function searchUsers(view, q) {
    const out = view.querySelector('#u-results');
    out.innerHTML = '<div class="skeleton" style="height:48px"></div>';
    try {
      let { users } = await api(`/api/admin/users?q=${encodeURIComponent(q)}`);
      if (!users.length && /^\d{15,25}$/.test(q)) users = [{ id: q, username: null, avatar: null, roles: [] }];
      const manage = can('panel.manage_roles');
      out.innerHTML = users.length
        ? `<div class="table-wrap"><table class="table"><tbody>${users
            .map(
              (u) => `<tr data-user="${esc(u.id)}">
            <td><div class="cell-title"><img class="avatar" src="${esc(u.avatar || DX.defaultAvatar)}" alt=""><div><b>${esc(u.username || '(aún no ha iniciado sesión)')}</b><small>${esc(u.id)}</small></div></div></td>
            <td>${(u.roles || []).map((r) => `<span class="role-pill" style="color:${DX.safeColor(r.color)}"><span class="swatch" style="background:${DX.safeColor(r.color)}"></span>${esc(r.name)}${manage && canTouchUser(u) && canTouchRole(r) ? `<button type="button" data-rm="${r.id}" aria-label="Quitar ${esc(r.name)}">×</button>` : ''}</span>`).join('') || '<span class="muted">Sin rangos</span>'}</td>
            <td class="actions">${
              manage && canTouchUser(u)
                ? `<select class="input" data-assign style="width:auto;display:inline-block;padding:6px 10px"><option value="">Añadir rango…</option>${rolesCache
                    .filter((r) => canTouchRole(r) && !(u.roles || []).some((x) => x.id === r.id))
                    .map((r) => `<option value="${r.id}">${esc(r.name)}</option>`)
                    .join('')}</select>`
                : ''
            }</td></tr>`
            )
            .join('')}</tbody></table></div>`
        : '<p class="panel-sub">Sin resultados. Prueba con el ID de Discord completo.</p>';
      out.onclick = async (e) => {
        const rm = e.target.closest('[data-rm]');
        if (!rm) return;
        const uid = rm.closest('[data-user]').dataset.user;
        try {
          await api(`/api/admin/users/${encodeURIComponent(uid)}/roles/${rm.dataset.rm}`, { method: 'DELETE' });
          DX.toast('Rango retirado.');
          searchUsers(view, q);
        } catch (err) {
          DX.toast(err.message, 'error');
        }
      };
      out.onchange = async (e) => {
        const sel = e.target.closest('[data-assign]');
        if (!sel || !sel.value) return;
        const uid = sel.closest('[data-user]').dataset.user;
        try {
          await api(`/api/admin/users/${encodeURIComponent(uid)}/roles`, { method: 'POST', body: { roleId: Number(sel.value) } });
          DX.toast('Rango asignado.');
          searchUsers(view, q);
        } catch (err) {
          DX.toast(err.message, 'error');
          sel.value = '';
        }
      };
    } catch (err) {
      out.innerHTML = `<div class="banner banner-danger">${esc(err.message)}</div>`;
    }
  }

  function openRole(role) {
    const isEdit = !!role;
    const active = new Set(role ? role.permissions : []);
    const groups = {};
    permsCache.forEach((p) => {
      const g = PERM_GROUPS[p.key.split('.')[0]] || 'Otros';
      (groups[g] = groups[g] || []).push(p);
    });
    const color = role ? hex6(role.color) : '#37d6b4';
    const ownPerms = new Set(me.permissions || []);
    const defaultPos = myRank() === Infinity ? 10 : Math.max(0, Math.min(10, myRank() - 1));
    drawer({
      title: isEdit ? `Editar ${role.name}` : 'Crear rango',
      body: `
        <div class="field-row-2">
          <div class="field"><label for="r-name">Nombre</label><input id="r-name" name="name" type="text" maxlength="40" value="${esc(role ? role.name : '')}" placeholder="Moderador"></div>
          <div class="field"><label for="r-color">Color</label><input id="r-color" name="color" type="color" value="${esc(color)}"></div>
        </div>
        <div class="field"><label for="r-pos">Posición (mayor = más arriba)</label><input id="r-pos" name="position" type="number" value="${role ? Number(role.position) || 0 : defaultPos}"><span class="field-hint">Debe ser menor que la de tu rango más alto.</span></div>
        <div class="field"><span class="field-label">Permisos</span><div class="perm-groups">${Object.entries(groups)
          .map(
            ([g, list]) => `<div class="perm-group"><h3>${esc(g)}</h3>${list
              .map((p) => `<label class="perm-check"${ownPerms.has(p.key) || myRank() === Infinity ? '' : ' title="No tienes este permiso, así que no puedes concederlo ni quitarlo"'}><input type="checkbox" name="perm" value="${esc(p.key)}" ${active.has(p.key) ? 'checked' : ''} ${ownPerms.has(p.key) || myRank() === Infinity ? '' : 'disabled'}><span><b>${esc(p.label)}</b><small>${esc(p.description || '')}</small><br><code>${esc(p.key)}</code></span></label>`)
              .join('')}</div>`
          )
          .join('')}</div></div>`,
      async onSave(dr) {
        const f = dr.form;
        const payload = {
          name: f.elements.name.value.trim(),
          color: f.elements.color.value,
          position: Number(f.elements.position.value) || 0,
          permissionKeys: Array.from(f.querySelectorAll('input[name="perm"]:checked:not(:disabled)')).map((x) => x.value),
        };
        if (!payload.name) throw new Error('Falta el nombre.');
        if (isEdit) await api(`/api/admin/roles/${role.id}`, { method: 'PATCH', body: payload });
        else await api('/api/admin/roles', { method: 'POST', body: payload });
        DX.toast(isEdit ? 'Rango actualizado.' : 'Rango creado.');
        app.rerender();
      },
      onDelete: isEdit
        ? async () => {
            await api(`/api/admin/roles/${role.id}`, { method: 'DELETE' });
            DX.toast('Rango eliminado.');
            app.rerender();
          }
        : null,
      deleteTitle: '¿Eliminar rango?',
    });
  }

  /* =====================================================================
     BOOT
     ===================================================================== */
  DX.me.then((session) => {
    if (!session || !session.user) return denied(root, 'Panel de Desafio Xtremo', 'Inicia sesión con Discord para entrar.', true, '/admin.html');
    me = session.user;
    if (!can('panel.access')) return denied(root, 'Sin acceso', 'Tu cuenta no tiene acceso al panel de administración.', false);
    app = shell({
      root,
      user: me,
      name: 'Panel',
      brand: `<a class="app-brand" href="/"><img src="/assets/wordmark.png" alt="Desafio Xtremo"><span class="app-brand-tag pixel">Panel</span></a>`,
      groups: [
        { items: [{ id: 'resumen', label: 'Resumen', icon: 'home', render: renderOverview }] },
        {
          title: 'Contenido',
          items: [
            { id: 'anuncios', label: 'Anuncios', icon: 'news', render: renderAnnouncements, onSub: (s) => s === 'new' && can('announcements.manage') && openAnnouncement(null) },
            { id: 'wiki', label: 'Wiki', icon: 'book', render: renderWiki, onSub: (s) => s === 'new' && can('wiki.manage') && openWikiPage(null) },
            { id: 'equipo', label: 'Equipo', icon: 'users', render: renderTeam, onSub: (s) => s === 'new' && can('team.manage') && openMember(null) },
          ],
        },
        { title: 'Moderación', items: [{ id: 'sanciones', label: 'Sanciones', icon: 'gavel', visible: can('sanctions.access'), render: renderSanctions, onSub: (s) => s === 'new' && openSanction() }] },
        {
          title: 'Sistema',
          items: [
            { id: 'estadisticas', label: 'Estadísticas', icon: 'chart', visible: can('panel.view_stats'), render: (v, alive) => ((statsData = null), renderStats(v, alive)) },
            { id: 'uso', label: 'Uso de recursos', icon: 'gauge', visible: can('panel.view_usage'), render: renderUsage },
            { id: 'rangos', label: 'Rangos y permisos', icon: 'shield', render: renderRoles },
          ],
        },
      ],
      footLinks: [{ href: '/', label: 'Ver la web', icon: 'ext' }].concat(can('devzone.access') ? [{ href: '/devzone.html', label: 'Dev Zone', icon: 'code' }] : []),
      commands: [
        can('announcements.manage') && { group: 'Acciones', label: 'Nuevo anuncio', icon: 'plus', run: () => (location.hash = 'anuncios/new') },
        can('wiki.manage') && { group: 'Acciones', label: 'Nueva página de wiki', icon: 'plus', run: () => (location.hash = 'wiki/new') },
        can('team.manage') && { group: 'Acciones', label: 'Añadir miembro del equipo', icon: 'plus', run: () => (location.hash = 'equipo/new') },
        can('sanctions.access') && { group: 'Acciones', label: 'Registrar sanción', icon: 'gavel', run: () => (location.hash = 'sanciones/new') },
        { group: 'Enlaces', label: 'Abrir la web pública', icon: 'ext', run: () => window.open('/', '_blank') },
        can('devzone.access') && { group: 'Enlaces', label: 'Ir a Dev Zone', icon: 'code', run: () => (location.href = '/devzone.html') },
      ].filter(Boolean),
    });
  });
})();
