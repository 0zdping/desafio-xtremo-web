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
  const HEART_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z"/></svg>';

  let csrfToken = '';
  let loggedIn = false;
  let likedIds = [];

  function loginUrl() {
    return `/api/auth/login?return_to=${encodeURIComponent(location.pathname)}`;
  }

  function renderCard(a) {
    const pinned = !!a.pinned;
    const date = formatDate(a.created_at);
    const href = a.slug ? `anuncios/${encodeURIComponent(a.slug)}` : '';
    const tag = href ? 'a' : 'article';
    const hrefAttr = href ? ` href="${escapeHtml(href)}"` : '';
    const imageInner = a.hero_image_url
      ? `<img src="${escapeHtml(a.hero_image_url)}" alt="" loading="lazy">`
      : '';
    const liked = likedIds.includes(a.id);
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
          <div class="post-card-stats">
            <span class="post-card-views">${EYE_ICON}${escapeHtml(String(a.views || 0))}</span>
            <button type="button" class="like-btn${liked ? ' liked' : ''}" data-like-id="${a.id}" aria-pressed="${liked ? 'true' : 'false'}">
              ${HEART_ICON}<span class="like-count">${a.likes || 0}</span>
            </button>
          </div>
        </div>
      </${tag}>
    `;
  }

  async function toggleLike(btn) {
    const id = Number(btn.dataset.likeId);
    if (!loggedIn) {
      location.href = loginUrl();
      return;
    }
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      const res = await fetch(`/api/announcements/${id}/like`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error((body && body.error) || `Error ${res.status}`);
      btn.classList.toggle('liked', body.liked);
      btn.setAttribute('aria-pressed', body.liked ? 'true' : 'false');
      const countEl = btn.querySelector('.like-count');
      if (countEl) countEl.textContent = body.likes;
    } catch (err) {
      // Silent — a failed like toggle isn't worth an alert here.
    } finally {
      btn.disabled = false;
    }
  }

  function wireLikeButtons() {
    feed.querySelectorAll('.like-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleLike(btn);
      });
    });
  }

  Promise.all([
    fetch('/api/auth/me', { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch('/api/announcements/liked', { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch('/api/announcements', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject())),
  ])
    .then(([me, liked, data]) => {
      if (me) {
        csrfToken = me.csrfToken || '';
        loggedIn = !!me.user;
      }
      if (liked && Array.isArray(liked.ids)) likedIds = liked.ids;

      const items = Array.isArray(data && data.announcements) ? data.announcements : [];
      if (!items.length) {
        if (empty) empty.hidden = false;
        return;
      }
      feed.innerHTML = items.map(renderCard).join('');
      wireLikeButtons();
      window.bindReveal && window.bindReveal();
    })
    .catch(() => {
      if (empty) empty.hidden = false;
    });
})();
