/* ==========================================================================
   wiki.js · sidebar (grouped + filterable, "/" to focus), article view
   (?p=slug, history-aware), heading anchors, callouts (> [!TIP] ...),
   "En esta página" TOC with scrollspy, prev/next pager.
   ========================================================================== */
(function () {
  const DX = window.DX;
  const shell = document.getElementById('wiki-shell');
  const side = document.getElementById('wiki-side');
  const linksEl = document.getElementById('wiki-links');
  const filterEl = document.getElementById('wiki-filter');
  const article = document.getElementById('wiki-article');
  const toc = document.getElementById('wiki-toc');
  const tocList = document.getElementById('wiki-toc-list');
  const empty = document.getElementById('wiki-empty');
  if (!shell || !article) return;

  const esc = DX.escapeHtml;
  let pages = [];
  const cache = new Map();
  let current = null;
  let spy = null;

  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const slugify = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'seccion';

  function renderMarkdown(md) {
    try {
      if (window.marked && window.DOMPurify) return window.DOMPurify.sanitize(window.marked.parse(md || ''));
    } catch (err) {}
    return `<p>${esc(md || '')}</p>`;
  }

  /* ---------- sidebar ---------- */
  function ordered() {
    // group order = first appearance (API already sorts by category, position)
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
    return { groups, byCat, flat: groups.flatMap((g) => byCat.get(g)) };
  }

  function renderSidebar() {
    const q = norm(filterEl.value.trim());
    const { groups, byCat } = ordered();
    let any = false;
    linksEl.innerHTML = groups
      .map((cat) => {
        const items = byCat.get(cat).filter((p) => !q || norm(p.title + ' ' + cat).includes(q));
        if (!items.length) return '';
        any = true;
        return `<div class="wiki-cat"><div class="wiki-cat-title">${esc(cat)}</div>${items
          .map(
            (p) =>
              `<a class="wiki-link" href="?p=${encodeURIComponent(p.slug)}" data-slug="${esc(p.slug)}"${current === p.slug ? ' aria-current="page"' : ''}>${esc(p.title)}</a>`
          )
          .join('')}</div>`;
      })
      .join('');
    if (!any) linksEl.innerHTML = '<p class="wiki-side-empty">Ninguna página coincide.</p>';
  }

  linksEl.addEventListener('click', (e) => {
    const a = e.target.closest('.wiki-link');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    load(a.dataset.slug, true);
    side.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  });
  filterEl.addEventListener('input', renderSidebar);
  filterEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = linksEl.querySelector('.wiki-link');
      if (first) load(first.dataset.slug, true);
    }
    if (e.key === 'Escape') {
      filterEl.value = '';
      renderSidebar();
      filterEl.blur();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || document.activeElement.isContentEditable) return;
    e.preventDefault();
    side.classList.add('open');
    filterEl.focus();
  });
  const toggle = side.querySelector('.wiki-mobile-toggle');
  toggle.addEventListener('click', () => {
    const open = !side.classList.contains('open');
    side.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* ---------- article ---------- */
  function enhance(container) {
    const used = new Set();
    container.querySelectorAll('h2, h3').forEach((h) => {
      let id = slugify(h.textContent);
      while (used.has(id)) id += '-2';
      used.add(id);
      h.id = id;
      const a = document.createElement('a');
      a.className = 'heading-anchor';
      a.href = '#' + id;
      a.textContent = '#';
      a.setAttribute('aria-label', 'Enlace a esta sección');
      h.appendChild(a);
    });
    DX.mdCallouts(container);
    container.querySelectorAll('a[href]').forEach((a) => {
      try {
        const u = new URL(a.getAttribute('href'), location.href);
        if (u.origin !== location.origin) {
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        }
      } catch (err) {}
    });
  }

  function buildToc() {
    if (spy) spy.disconnect();
    const heads = Array.from(article.querySelectorAll('.md-content h2, .md-content h3'));
    if (heads.length < 2) {
      toc.hidden = true;
      return;
    }
    toc.hidden = false;
    tocList.innerHTML = heads
      .map((h) => `<li><a href="#${esc(h.id)}" class="lvl-${h.tagName === 'H3' ? 3 : 2}">${esc(h.firstChild ? h.firstChild.textContent : h.textContent)}</a></li>`)
      .join('');
    const links = new Map(Array.from(tocList.querySelectorAll('a')).map((a) => [a.getAttribute('href').slice(1), a]));
    spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          links.forEach((a) => a.classList.remove('is-active'));
          const a = links.get(e.target.id);
          if (a) a.classList.add('is-active');
        });
      },
      { rootMargin: '-90px 0px -65% 0px' }
    );
    heads.forEach((h) => spy.observe(h));
  }

  function pager(slug) {
    const { flat } = ordered();
    const i = flat.findIndex((p) => p.slug === slug);
    const prev = flat[i - 1];
    const next = flat[i + 1];
    if (!prev && !next) return '';
    return `<nav class="wiki-pager" aria-label="Paginación">
      ${prev ? `<a class="prev" href="?p=${encodeURIComponent(prev.slug)}" data-slug="${esc(prev.slug)}"><small>← Anterior</small><span>${esc(prev.title)}</span></a>` : '<span></span>'}
      ${next ? `<a class="next" href="?p=${encodeURIComponent(next.slug)}" data-slug="${esc(next.slug)}"><small>Siguiente →</small><span>${esc(next.title)}</span></a>` : ''}
    </nav>`;
  }
  article.addEventListener('click', (e) => {
    const a = e.target.closest('.wiki-pager a[data-slug]');
    if (!a || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    load(a.dataset.slug, true);
  });

  function show(page) {
    const meta = pages.find((p) => p.slug === page.slug) || {};
    const cat = page.category || meta.category || 'General';
    article.innerHTML = `
      <nav class="breadcrumb" aria-label="Ruta"><a href="/wiki.html">Wiki</a><span>/</span><span>${esc(cat)}</span></nav>
      <h1 class="wiki-title">${esc(page.title)}</h1>
      ${page.updated_at ? `<p class="wiki-updated"><span class="status-dot ok"></span>Actualizado <time datetime="${esc(page.updated_at)}" title="${esc(DX.formatDate(page.updated_at))}">${esc(DX.relTime(page.updated_at))}</time></p>` : ''}
      <div class="md-content">${renderMarkdown(page.content)}</div>
      ${pager(page.slug)}`;
    enhance(article.querySelector('.md-content'));
    buildToc();
    document.title = `${page.title} · Wiki · Desafio Xtremo`;
    if (location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView();
    }
  }

  function load(slug, push) {
    current = slug;
    renderSidebar();
    if (push) {
      history.pushState({ slug }, '', '?p=' + encodeURIComponent(slug));
      const top = shell.getBoundingClientRect().top + window.scrollY - 90;
      if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
    }
    const done = (page) => {
      if (current === slug) show(page);
    };
    if (cache.has(slug)) return done(cache.get(slug));
    article.setAttribute('aria-busy', 'true');
    fetch('/api/wiki/' + encodeURIComponent(slug))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!data || !data.page) throw new Error();
        cache.set(slug, data.page);
        done(data.page);
      })
      .catch(() => {
        if (current !== slug) return;
        article.innerHTML = '<div class="empty-state"><strong>No se ha podido cargar esta página</strong><span>Inténtalo de nuevo en un momento.</span></div>';
        toc.hidden = true;
      })
      .finally(() => article.removeAttribute('aria-busy'));
  }

  window.addEventListener('popstate', () => {
    if (!pages.length) return;
    const wanted = new URLSearchParams(location.search).get('p');
    load(pages.some((p) => p.slug === wanted) ? wanted : pages[0].slug, false);
  });

  fetch('/api/wiki')
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((data) => {
      pages = Array.isArray(data && data.pages) ? data.pages : [];
      if (!pages.length) throw new Error('empty');
      const wanted = new URLSearchParams(location.search).get('p');
      load(pages.some((p) => p.slug === wanted) ? wanted : ordered().flat[0].slug, false);
    })
    .catch(() => {
      shell.hidden = true;
      empty.hidden = false;
    });
})();
