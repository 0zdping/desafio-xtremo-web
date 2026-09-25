/* ==========================================================================
   anuncios.js · announcements feed: category chips (synced to ?cat=),
   client-side search, featured first card, "load more" paging, likes.
   ========================================================================== */
(function () {
  const DX = window.DX;
  const grid = document.getElementById('feed-grid');
  if (!grid) return;
  const chipsEl = document.getElementById('feed-chips');
  const searchEl = document.getElementById('feed-search');
  const skeleton = document.getElementById('feed-skeleton');
  const empty = document.getElementById('feed-empty');
  const emptyTitle = document.getElementById('feed-empty-title');
  const emptyText = document.getElementById('feed-empty-text');
  const moreWrap = document.getElementById('feed-more');
  const PAGE = 9;

  let all = [];
  let liked = new Set();
  let shown = PAGE;
  const params = new URLSearchParams(location.search);
  let cat = params.get('cat') || '';
  let query = '';

  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  function filtered() {
    const q = norm(query);
    return all.filter((a) => {
      if (cat && (a.category || 'Anuncio') !== cat) return false;
      if (q && !norm(a.title + ' ' + (a.excerpt || '')).includes(q)) return false;
      return true;
    });
  }

  function renderChips() {
    const counts = new Map();
    all.forEach((a) => {
      const c = a.category || 'Anuncio';
      counts.set(c, (counts.get(c) || 0) + 1);
    });
    if (cat && !counts.has(cat)) {
      const match = Array.from(counts.keys()).find((c) => c.toLowerCase() === cat.toLowerCase());
      cat = match || '';
    }
    const chip = (value, label, n) =>
      `<button type="button" class="filter-chip" data-cat="${DX.escapeHtml(value)}" aria-pressed="${cat === value}">${DX.escapeHtml(label)}<small>${n}</small></button>`;
    chipsEl.innerHTML = chip('', 'Todos', all.length) + Array.from(counts.entries()).map(([c, n]) => chip(c, c, n)).join('');
  }

  function render() {
    const list = filtered();
    const page = list.slice(0, shown);
    const featured = !cat && !query;
    grid.innerHTML = page.map((a, i) => DXPosts.card(a, { featured: featured && i === 0, liked: liked.has(Number(a.id)), showStats: true })).join('');
    moreWrap.hidden = list.length <= shown;
    const status = document.getElementById('feed-status');
    if (status) status.textContent = list.length === 1 ? '1 anuncio' : `${list.length} anuncios`;
    const none = !list.length;
    empty.hidden = !none;
    if (none) {
      const filtering = !!(cat || query);
      emptyTitle.textContent = filtering ? 'Nada por aquí' : 'Todavía no hay anuncios';
      emptyText.textContent = filtering ? 'Ningún anuncio coincide con ese filtro.' : 'En cuanto haya novedades del evento, aparecerán aquí.';
    }
    window.DXMotion && window.DXMotion.refresh();
  }

  function syncUrl() {
    const p = new URLSearchParams(location.search);
    if (cat) p.set('cat', cat);
    else p.delete('cat');
    const qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  }

  chipsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    cat = b.dataset.cat;
    shown = PAGE;
    chipsEl.querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.cat === cat ? 'true' : 'false'));
    syncUrl();
    render();
  });

  let t = null;
  searchEl.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      query = searchEl.value.trim();
      shown = PAGE;
      render();
    }, 160);
  });

  moreWrap.querySelector('button').addEventListener('click', () => {
    shown += PAGE;
    render();
  });

  DXPosts.bindLikes(grid);

  Promise.all([
    // no-store: the browser would otherwise keep this JSON for its 2 min
    // max-age and show stale like counts after liking a post and coming back
    fetch('/api/announcements', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))),
    DXPosts.likedIds(),
  ])
    .then(([data, ids]) => {
      all = Array.isArray(data && data.announcements) ? data.announcements : [];
      liked = new Set(ids);
      skeleton.remove();
      renderChips();
      render();
    })
    .catch(() => {
      skeleton.remove();
      empty.hidden = false;
      emptyTitle.textContent = 'No se han podido cargar los anuncios';
      emptyText.textContent = 'Vuelve a intentarlo en un momento.';
    });
})();
