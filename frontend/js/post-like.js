/* ---------- like button on the individual announcement page ---------- */
(function () {
  const btn = document.getElementById('post-like-btn');
  if (!btn) return;

  const postId = Number(btn.dataset.postId);
  const countEl = btn.querySelector('.like-count');
  let csrfToken = '';
  let loggedIn = false;
  let busy = false;

  function loginUrl() {
    return `/api/auth/login?return_to=${encodeURIComponent(location.pathname)}`;
  }

  function setLiked(liked) {
    btn.classList.toggle('liked', liked);
    btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
  }

  Promise.all([
    fetch('/api/auth/me', { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch('/api/announcements/liked', { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]).then(([me, liked]) => {
    if (me) {
      csrfToken = me.csrfToken || '';
      loggedIn = !!me.user;
    }
    if (liked && Array.isArray(liked.ids) && liked.ids.includes(postId)) setLiked(true);
  });

  btn.addEventListener('click', async () => {
    if (busy) return;
    if (!loggedIn) {
      location.href = loginUrl();
      return;
    }
    busy = true;
    btn.disabled = true;
    try {
      const res = await fetch(`/api/announcements/${postId}/like`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error((body && body.error) || `Error ${res.status}`);
      setLiked(body.liked);
      if (countEl) countEl.textContent = body.likes;
    } catch (err) {
      // Silent: a failed like toggle isn't worth interrupting the reader with an alert.
    } finally {
      busy = false;
      btn.disabled = false;
    }
  });
})();
