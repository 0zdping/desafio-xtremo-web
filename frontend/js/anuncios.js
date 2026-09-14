/* ---------- anuncios page: full announcements feed ---------- */
(function () {
  const feed = document.getElementById('announcements-feed-list');
  const empty = document.getElementById('announcements-empty');
  if (!feed) return;

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

  const PIN_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.6L20 8l-4.6 4 1.4 6-4.8-3.4L7.2 18l1.4-6L4 8l6.2-.4z"/></svg>';

  fetch('/api/announcements')
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((data) => {
      const items = Array.isArray(data && data.announcements) ? data.announcements : [];
      if (!items.length) {
        if (empty) empty.hidden = false;
        return;
      }
      feed.innerHTML = items
        .map((a) => {
          const pinned = !!a.pinned;
          const date = formatDate(a.created_at);
          return `
            <article class="announcement-full-card reveal${pinned ? ' pinned' : ''}">
              <div class="announcement-full-head">
                ${pinned ? `<span class="pin-badge">${PIN_ICON}Fijado</span>` : ''}
                <time class="announcement-date">${escapeHtml(date)}</time>
              </div>
              <h2>${escapeHtml(a.title)}</h2>
              <div class="md-content">${renderMarkdown(a.body)}</div>
            </article>
          `;
        })
        .join('');
      window.bindReveal && window.bindReveal();
    })
    .catch(() => {
      if (empty) empty.hidden = false;
    });
})();
