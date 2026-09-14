/* ---------- home page dynamic sections: announcements teaser + team ---------- */
(function () {
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

  // Strip markdown roughly for a plain-text teaser excerpt.
  function plainExcerpt(md, max) {
    if (!md) return '';
    const text = String(md)
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[#>*_~`-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length <= max) return text;
    return text.slice(0, max).replace(/\s+\S*$/, '') + '…';
  }

  const PIN_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.6L20 8l-4.6 4 1.4 6-4.8-3.4L7.2 18l1.4-6L4 8l6.2-.4z"/></svg>';

  /* ---------- announcements teaser ---------- */
  (function () {
    const section = document.getElementById('anuncios');
    const grid = document.getElementById('announcements-teaser-grid');
    if (!section || !grid) return;

    fetch('/api/announcements')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const items = Array.isArray(data && data.announcements) ? data.announcements : [];
        if (!items.length) return; // leave section hidden
        const top = items.slice(0, 3);
        grid.innerHTML = top
          .map((a) => {
            const pinned = !!a.pinned;
            return `
              <article class="announcement-card reveal${pinned ? ' pinned' : ''}">
                <div class="announcement-card-head">
                  ${pinned ? `<span class="pin-badge">${PIN_ICON}Fijado</span>` : ''}
                  <time class="announcement-date">${escapeHtml(formatDate(a.created_at))}</time>
                </div>
                <h3>${escapeHtml(a.title)}</h3>
                <p>${escapeHtml(plainExcerpt(a.body, 140))}</p>
              </article>
            `;
          })
          .join('');
        section.hidden = false;
        window.bindReveal && window.bindReveal();
      })
      .catch(() => {
        /* keep the section hidden — no error left visible */
      });
  })();

  /* ---------- team ---------- */
  (function () {
    const section = document.getElementById('equipo');
    const groupsWrap = document.getElementById('team-groups');
    if (!section || !groupsWrap) return;

    fetch('/api/team')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const members = Array.isArray(data && data.members) ? data.members : [];
        if (!members.length) return; // leave section hidden

        const staff = members.filter((m) => m.team === 'staff');
        const dev = members.filter((m) => m.team === 'dev');
        const rest = members.filter((m) => m.team !== 'staff' && m.team !== 'dev');

        const groups = [];
        if (staff.length) groups.push({ title: 'Staff', members: staff });
        if (dev.length) groups.push({ title: 'Desarrollo', members: dev });
        if (rest.length) groups.push({ title: 'Equipo', members: rest });

        groupsWrap.innerHTML = groups
          .map(
            (g) => `
              <div class="team-group">
                <h3 class="team-group-title reveal">${escapeHtml(g.title)}</h3>
                <div class="team-grid">
                  ${g.members.map(renderTeamCard).join('')}
                </div>
              </div>
            `
          )
          .join('');
        section.hidden = false;
        window.bindReveal && window.bindReveal();
      })
      .catch(() => {
        /* keep the section hidden — no error left visible */
      });

    function renderTeamCard(m) {
      const nick = String(m.mc_nick || '');
      const color = /^#[0-9a-fA-F]{3,8}$/.test(m.rank_color || '') ? m.rank_color : '#6fb3ff';
      const rankLabel = m.rank_label || '';
      const fn = m.function_text || '';
      const skinUrl = `https://mc-heads.net/body/${encodeURIComponent(nick)}/300`;
      return `
        <article class="team-card reveal">
          <div class="team-card-img">
            <img src="${escapeHtml(skinUrl)}" alt="Skin de ${escapeHtml(nick)}" loading="lazy">
          </div>
          <div class="team-card-body">
            <h4 class="team-card-name">${escapeHtml(nick)}</h4>
            ${rankLabel ? `<span class="rank-pill" style="border-color:${color}55;color:${color}"><span class="rank-swatch" style="background:${color}"></span>${escapeHtml(rankLabel)}</span>` : ''}
            ${fn ? `<p class="team-card-fn">${escapeHtml(fn)}</p>` : ''}
          </div>
        </article>
      `;
    }
  })();
})();
