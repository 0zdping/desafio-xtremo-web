import { withQuotaHandling } from '../../backend/lib/http.js';
import { cachedPublicJson } from '../../backend/lib/edgeCache.js';
import { d1First, d1Run } from '../../backend/lib/db.js';

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return ''; }
}

export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env, params } = context;

  const { post } = await cachedPublicJson(context, request.url, 120, async () => {
    const post = await d1First(env, 'SELECT * FROM announcements WHERE slug = ?', [params.slug]);
    return { post };
  }).then((res) => res.clone().json());

  if (!post) {
    return new Response('<!doctype html><title>No encontrado</title><p>Anuncio no encontrado.</p>', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  await d1Run(env, 'UPDATE announcements SET views = views + 1 WHERE id = ?', [post.id]);

  const title = escapeHtml(post.title);
  const excerpt = escapeHtml(post.excerpt || '');
  const heroUrl = post.hero_image_url ? escapeHtml(post.hero_image_url) : '';
  const category = escapeHtml(post.category || 'Anuncio');
  const dateStr = formatDate(post.created_at);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — Desafio Xtremo</title>
<meta name="description" content="${excerpt}">
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${excerpt}">
${heroUrl ? `<meta property="og:image" content="${heroUrl}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/tokens.css">
<link rel="stylesheet" href="/css/home.css">
</head>
<body>
<div id="field"></div>
<div class="nebula-field" id="nebula-field"><div class="nebula nebula-1"></div><div class="nebula nebula-2"></div><div class="nebula nebula-3"></div></div>
<div class="grain"></div>
<div id="account-corner" class="account-corner"></div>
<div class="nav-wrap">
  <nav class="nav glass">
    <a href="/index.html" class="nav-logo"><span class="dot"></span>Desafio Xtremo</a>
    <ul class="nav-links">
      <li><a href="/index.html">Inicio</a></li>
      <li><a href="/wiki.html">Wiki</a></li>
      <li><a href="/anuncios.html" class="active">Anuncios</a></li>
      <li><a href="/index.html#equipo">Equipo</a></li>
      <li><a href="/invite" target="_blank" rel="noopener">Discord</a></li>
    </ul>
    <div class="nav-right"><button class="nav-toggle" aria-label="Abrir menú"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button></div>
  </nav>
</div>
<div class="mobile-sheet">
  <a href="/index.html">Inicio</a>
  <a href="/wiki.html">Wiki</a>
  <a href="/anuncios.html">Anuncios</a>
  <a href="/index.html#equipo">Equipo</a>
  <a href="/invite" target="_blank" rel="noopener">Discord</a>
</div>

<section class="post-detail">
  <div class="container post-detail-container">
    ${heroUrl ? `<div class="post-detail-hero"><img src="${heroUrl}" alt="${title}"></div>` : ''}
    <h1 class="post-detail-title">${title}</h1>
    <div class="post-detail-meta">
      <span class="category-pill">${category}</span>
      <span class="post-detail-date">${escapeHtml(dateStr)}</span>
    </div>
    <div class="post-detail-stats">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
      ${post.views}
    </div>
    <div class="md-content post-detail-body">${post.body || ''}</div>
    <a href="/anuncios.html" class="post-detail-back">← Volver a los anuncios</a>
  </div>
</section>

<footer class="site-footer">
  <div class="footer-bar"><div class="container"><span class="footer-ip">IP · próximamente</span><div class="footer-social"><a href="/invite" target="_blank" rel="noopener" aria-label="Discord"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.3 4.4A19.8 19.8 0 0015.6 3l-.3.6a14 14 0 014.1 1.6 17 17 0 00-14.8 0A14 14 0 018.7 3.6L8.4 3a19.7 19.7 0 00-4.7 1.4C1 9 .3 13.5.6 18a20 20 0 006 3l1-1.4a12.8 12.8 0 01-1.9-.9l.5-.4a14.3 14.3 0 0011.6 0l.5.4c-.6.4-1.2.6-1.9.9l1 1.4a20 20 0 006-3c.4-5.2-.9-9.7-3.1-13.6zM8.5 15c-1 0-1.8-1-1.8-2s.8-2 1.8-2 1.9 1 1.8 2c0 1-.8 2-1.8 2zm7 0c-1 0-1.8-1-1.8-2s.8-2 1.8-2 1.9 1 1.8 2c0 1-.8 2-1.8 2z"/></svg></a></div></div></div>
  <div class="footer-bottom"><div class="container"><p>© 2026 Desafio Xtremo</p></div></div>
</footer>
<script src="/js/site.js"></script>
<script src="/js/analytics.js"></script>
</body>
</html>`;

  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
});
