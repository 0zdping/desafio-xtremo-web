/* ==========================================================================
   post.js · single announcement page (/anuncios/<slug>): like buttons
   (header + end card stay in sync), share/copy link, related posts.
   ========================================================================== */
(function () {
  const DX = window.DX;
  const article = document.querySelector('.post[data-post-id]');
  if (!article) return;
  const postId = Number(article.dataset.postId);
  const main = document.getElementById('main');

  DXPosts.bindLikes(main);
  DXPosts.likedIds().then((ids) => {
    if (!ids.includes(postId)) return;
    main.querySelectorAll(`[data-like-id="${postId}"]`).forEach((b) => {
      b.classList.add('liked');
      b.setAttribute('aria-pressed', 'true');
    });
  });

  const share = document.querySelector('[data-share]');
  if (share) {
    share.addEventListener('click', async () => {
      const url = share.dataset.share;
      if (navigator.share && window.matchMedia('(pointer:coarse)').matches) {
        try {
          await navigator.share({ title: document.title, url });
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return;
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        DX.toast('Enlace copiado al portapapeles.', 'ok');
      } catch (err) {
        DX.toast('No se pudo copiar el enlace.', 'error');
      }
    });
  }

  /* related: three most recent other posts */
  const related = document.getElementById('post-related');
  const grid = document.getElementById('related-grid');
  if (related && grid) {
    fetch('/api/announcements')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const others = (data.announcements || []).filter((a) => Number(a.id) !== postId).slice(0, 3);
        if (!others.length) return;
        grid.innerHTML = others.map((a) => DXPosts.card(a)).join('');
        related.hidden = false;
        window.DXMotion && window.DXMotion.refresh();
      })
      .catch(() => {});
  }
})();
