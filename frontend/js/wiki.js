/* ---------- wiki page: sidebar + markdown content ---------- */
(function () {
  const section = document.getElementById('wiki-section');
  const empty = document.getElementById('wiki-empty');
  const sidebar = document.getElementById('wiki-sidebar');
  const contentEl = document.getElementById('wiki-content');
  if (!section || !sidebar || !contentEl) return;

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
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

  let pages = [];

  fetch('/api/wiki')
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((data) => {
      pages = Array.isArray(data && data.pages) ? data.pages : [];
      if (!pages.length) {
        section.hidden = true;
        if (empty) empty.hidden = false;
        return;
      }
      renderSidebar();
      const wanted = new URLSearchParams(location.search).get('p');
      const initial = (wanted && pages.some((p) => p.slug === wanted)) ? wanted : pages[0].slug;
      loadPage(initial, { push: false });
    })
    .catch(() => {
      section.hidden = true;
      if (empty) empty.hidden = false;
    });

  window.addEventListener('popstate', () => {
    if (!pages.length) return;
    const wanted = new URLSearchParams(location.search).get('p');
    const slug = (wanted && pages.some((p) => p.slug === wanted)) ? wanted : pages[0].slug;
    loadPage(slug, { push: false });
  });

  function renderSidebar() {
    const groups = [];
    const byCat = new Map();
    pages.forEach((p) => {
      const cat = p.category || 'General';
      if (!byCat.has(cat)) {
        byCat.set(cat, []);
        groups.push(cat);
      }
      byCat.get(cat).push(p);
    });

    sidebar.innerHTML = groups
      .map((cat) => {
        const items = byCat.get(cat);
        return `
          <div class="wiki-cat">
            <div class="wiki-cat-title">${escapeHtml(cat)}</div>
            ${items
              .map(
                (p) =>
                  `<a href="?p=${encodeURIComponent(p.slug)}" class="wiki-page-link" data-slug="${escapeHtml(p.slug)}">${escapeHtml(p.title)}</a>`
              )
              .join('')}
          </div>
        `;
      })
      .join('');

    sidebar.querySelectorAll('.wiki-page-link').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        loadPage(a.dataset.slug, { push: true });
      });
    });
  }

  function setActiveLink(slug) {
    sidebar.querySelectorAll('.wiki-page-link').forEach((a) => {
      a.classList.toggle('active', a.dataset.slug === slug);
    });
  }

  function loadPage(slug, opts) {
    setActiveLink(slug);
    contentEl.innerHTML = '<p class="wiki-content-msg">Cargando…</p>';

    fetch('/api/wiki/' + encodeURIComponent(slug))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const page = data && data.page;
        if (!page) return Promise.reject();

        if (opts && opts.push) {
          history.pushState(null, '', '?p=' + encodeURIComponent(slug));
        }

        const updated = formatDate(page.updated_at);
        contentEl.innerHTML = `
          <h1>${escapeHtml(page.title)}</h1>
          ${updated ? `<p class="wiki-content-meta">Actualizado el ${escapeHtml(updated)}</p>` : ''}
          <div class="md-content">${renderMarkdown(page.content)}</div>
        `;
        window.bindReveal && window.bindReveal();
      })
      .catch(() => {
        contentEl.innerHTML = '<p class="wiki-content-msg">No se ha podido cargar esta página. Inténtalo de nuevo más tarde.</p>';
      });
  }
})();
