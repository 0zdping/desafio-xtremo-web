/* ==========================================================================
   posts.js · announcement card markup shared by the home teaser and the
   announcements feed, so both always look the same.
   DXPosts.card(post, { featured, liked, showStats })
   DXPosts.readingTime(html)
   ========================================================================== */
(function () {
  const DX = window.DX;
  const ICON = {
    pin: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.8 5.6L20 8l-4.6 4 1.4 6-4.8-3.4L7.2 18l1.4-6L4 8l6.2-.4z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  };

  function readingTime(html, chars) {
    // The public list sends body_chars instead of the whole body: roughly
    // 7 characters of stored HTML per word.
    if (html == null && chars) return Math.max(1, Math.round(chars / 7 / 200));
    const words = String(html || '').replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }

  /** Placeholder cover when a post has no image: a deterministic pixel
   *  pattern tinted per post, instead of an empty grey box. */
  function placeholder(seedText) {
    let h = 0;
    for (const ch of String(seedText)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const hues = ['#37d6b4', '#a4f5c9', '#74d98a', '#f3b45e', '#bfe3ff'];
    const c = hues[h % hues.length];
    return `<div class="post-cover-ph" style="--ph:${c}" aria-hidden="true"><span class="pixel">DX</span></div>`;
  }

  function card(a, opts) {
    opts = opts || {};
    const esc = DX.escapeHtml;
    const href = a.slug ? `/anuncios/${encodeURIComponent(a.slug)}` : '';
    const cover = a.hero_image_url
      ? `<img src="${esc(a.hero_image_url)}" alt="" loading="lazy" decoding="async">`
      : placeholder(a.title || a.id);
    const mins = readingTime(a.body, a.body_chars);
    const stats = opts.showStats
      ? `<div class="post-card-stats">
           <span>${ICON.eye}${esc(String(a.views || 0))}</span>
           <button type="button" class="like-btn${opts.liked ? ' liked' : ''}" data-like-id="${Number(a.id)}" aria-pressed="${opts.liked ? 'true' : 'false'}" aria-label="Me gusta">
             ${ICON.heart}<span class="like-count">${Number(a.likes) || 0}</span>
           </button>
         </div>`
      : '';
    return `
      <article class="post-card spot${href ? ' has-link' : ''}${opts.featured ? ' is-featured' : ''}${a.pinned ? ' is-pinned' : ''}" data-reveal="up" data-category="${esc(a.category || 'Anuncio')}">
        <div class="post-card-cover">
          ${cover}
          ${a.pinned ? `<span class="pin-badge">${ICON.pin}Fijado</span>` : ''}
        </div>
        <div class="post-card-body">
          <div class="post-card-meta">
            <span class="category-pill">${esc(a.category || 'Anuncio')}</span>
            <time datetime="${esc(a.created_at || '')}">${esc(DX.formatDate(a.created_at))}</time>
            <span class="post-card-read">${ICON.clock}${mins} min</span>
          </div>
          <h3 class="post-card-title">${href ? `<a class="post-card-link" href="${esc(href)}">${esc(a.title)}</a>` : esc(a.title)}</h3>
          ${a.excerpt ? `<p class="post-card-excerpt">${esc(a.excerpt)}</p>` : ''}
          ${stats}
        </div>
      </article>`;
  }

  /** Wires every [data-like-id] button inside `root`. Optimistic: the heart
   *  flips immediately and rolls back if the request fails. Clicks inside a
   *  card link never navigate. */
  function bindLikes(root) {
    const pending = new Set();
    root.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-like-id]');
      if (!btn || !root.contains(btn)) return;
      e.preventDefault();
      e.stopPropagation();
      const id = Number(btn.dataset.likeId);
      if (!Number.isInteger(id) || pending.has(id)) return;
      const session = await DX.me;
      if (!session || !session.user) {
        location.href = DX.loginUrl();
        return;
      }
      const countEl = btn.querySelector('.like-count');
      const wasLiked = btn.classList.contains('liked');
      const before = Number(countEl && countEl.textContent) || 0;
      const apply = (liked, count) => {
        root.querySelectorAll(`[data-like-id="${id}"]`).forEach((b) => {
          b.classList.toggle('liked', liked);
          b.setAttribute('aria-pressed', liked ? 'true' : 'false');
          const c = b.querySelector('.like-count');
          if (c) c.textContent = count;
        });
      };
      pending.add(id);
      apply(!wasLiked, Math.max(0, before + (wasLiked ? -1 : 1)));
      if (!wasLiked) {
        btn.classList.remove('pulse');
        void btn.offsetWidth;
        btn.classList.add('pulse');
      }
      try {
        const res = await fetch(`/api/announcements/${id}/like`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'X-CSRF-Token': session.csrfToken || '' },
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || !body) throw new Error((body && body.error) || `Error ${res.status}`);
        apply(!!body.liked, Number(body.likes) || 0);
      } catch (err) {
        apply(wasLiked, before);
        DX.toast('No se pudo guardar tu me gusta. ' + err.message, 'error');
      } finally {
        pending.delete(id);
      }
    });
  }

  /** Liked ids for the current user (empty when logged out, and never asks
   *  the API at all for anonymous visitors). */
  async function likedIds() {
    const session = await DX.me;
    if (!session || !session.user) return [];
    try {
      const r = await fetch('/api/announcements/liked', { credentials: 'include' });
      const data = r.ok ? await r.json() : null;
      return data && Array.isArray(data.ids) ? data.ids.map(Number) : [];
    } catch (err) {
      return [];
    }
  }

  window.DXPosts = { card, readingTime, bindLikes, likedIds, ICON };
})();
