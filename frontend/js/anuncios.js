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

  const PIN_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.6L20 8l-4.6 4 1.4 6-4.8-3.4L7.2 18l1.4-6L4 8l6.2-.4z"/></svg>';
  const EYE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';

  function renderCard(a) {
    const pinned = !!a.pinned;
    const date = formatDate(a.created_at);
    const href = a.slug ? `anuncios/${encodeURIComponent(a.slug)}` : '';
    const tag = href ? 'a' : 'article';
    const hrefAttr = href ? ` href="${escapeHtml(href)}"` : '';
    const imageInner = a.hero_image_url
      ? `<img src="${escapeHtml(a.hero_image_url)}" alt="" loading="lazy">`
      : '';
    return `
      <${tag} class="post-card reveal${pinned ? ' pinned' : ''}"${hrefAttr}>
        <div class="post-card-image">
          ${imageInner}
          ${pinned ? `<span class="pin-badge">${PIN_ICON}Fijado</span>` : ''}
        </div>
        <div class="post-card-body">
          <div class="post-card-meta">
            ${a.category ? `<span class="category-pill">${escapeHtml(a.category)}</span>` : ''}
            <time>${escapeHtml(date)}</time>
          </div>
          <h3 class="post-card-title">${escapeHtml(a.title)}</h3>
          <p class="post-card-excerpt">${escapeHtml(a.excerpt || '')}</p>
          <div class="post-card-stats">${EYE_ICON}${escapeHtml(String(a.views || 0))}</div>
        </div>
      </${tag}>
    `;
  }

  fetch('/api/announcements')
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((data) => {
      const items = Array.isArray(data && data.announcements) ? data.announcements : [];
      if (!items.length) {
        if (empty) empty.hidden = false;
        return;
      }
      feed.innerHTML = items.map(renderCard).join('');
      window.bindReveal && window.bindReveal();
    })
    .catch(() => {
      if (empty) empty.hidden = false;
    });
})();
