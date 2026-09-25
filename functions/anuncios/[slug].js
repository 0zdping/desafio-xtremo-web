import { withQuotaHandling } from '../../backend/lib/http.js';
import { cachedPublicJson } from '../../backend/lib/edgeCache.js';
import { d1First, d1Run } from '../../backend/lib/db.js';

/* Server-rendered announcement page (/anuncios/<slug>). Rendered here rather
 * than client-side so link previews (Discord, X) get the real title, excerpt
 * and cover image. The NAV/FOOTER markup below mirrors frontend/index.html so
 * the shell is identical on every page: if you change the nav or footer
 * there, mirror it here too. */

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/** D1 stores "YYYY-MM-DD HH:MM:SS" in UTC without a zone marker. */
function toDate(iso) {
  if (!iso) return null;
  let s = String(iso);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) s = s.replace(' ', 'T') + 'Z';
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(iso) {
  const d = toDate(iso);
  return d ? d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' }) : '';
}

function readingTime(html) {
  const words = String(html || '').replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Crawlers, link unfurlers and speculative prefetches shouldn't inflate the
 *  public view counter (each of them was also a D1 write). */
function isCountableView(request) {
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  if (!ua || /bot|crawl|spider|slurp|preview|facebookexternalhit|embed|discord|whatsapp|telegram|curl|wget|python|headless/.test(ua)) return false;
  const purpose = (request.headers.get('sec-purpose') || request.headers.get('purpose') || '').toLowerCase();
  if (purpose.includes('prefetch') || purpose.includes('prerender')) return false;
  return true;
}

const HEAD = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#030b0a">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&family=Silkscreen&family=Unbounded:wght@600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/tokens.css">
<link rel="stylesheet" href="/css/site.css">
<link rel="stylesheet" href="/css/content.css">`;

const NAV = `<header class="site-nav">
  <div class="container">
    <a href="/" class="nav-logo" aria-label="Desafio Xtremo, inicio"><img src="/assets/wordmark.png" alt="Desafio Xtremo" width="148" height="20"></a>
    <ul class="nav-links">
      <li><a href="/">Inicio</a></li>
      <li><a href="/#recursos">El juego</a></li>
      <li><a href="/wiki.html">Wiki</a></li>
      <li><a href="/anuncios.html">Anuncios</a></li>
      <li><a href="/#equipo">Equipo</a></li>
    </ul>
    <div class="nav-right">
      <div id="account-slot"></div>
      <a href="/invite" target="_blank" rel="noopener" class="btn btn-discord btn-sm nav-cta">Discord</a>
      <button class="nav-toggle" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="mobile-menu"><span></span><span></span><span></span></button>
    </div>
  </div>
</header>
<div class="mobile-menu" id="mobile-menu">
  <nav aria-label="Menú móvil">
    <a href="/"><small>01</small>Inicio</a>
    <a href="/#recursos"><small>02</small>El juego</a>
    <a href="/wiki.html"><small>03</small>Wiki</a>
    <a href="/anuncios.html"><small>04</small>Anuncios</a>
    <a href="/invite" target="_blank" rel="noopener"><small>05</small>Discord</a>
  </nav>
  <div class="mobile-menu-account" id="mobile-account"></div>
</div>`;

const FOOTER = `<footer class="site-footer">
  <div class="container">
    <div class="footer-top">
      <div class="footer-brand">
        <img src="/assets/wordmark.png" alt="Desafio Xtremo" width="163" height="22" loading="lazy">
        <p>Un evento de Minecraft por equipos, hecho por y para jugadores. Proyecto independiente.</p>
      </div>
      <div class="footer-col">
        <h3>Explorar</h3>
        <ul><li><a href="/#recursos">El juego</a></li><li><a href="/wiki.html">Wiki</a></li><li><a href="/anuncios.html">Anuncios</a></li><li><a href="/#equipo">Equipo</a></li></ul>
      </div>
      <div class="footer-col">
        <h3>Comunidad</h3>
        <ul><li><a href="/invite" target="_blank" rel="noopener">Discord</a></li></ul>
      </div>
      <div class="footer-col">
        <h3>Servidor</h3>
        <div class="server-ip"><span class="status-dot"></span><div><p class="server-ip-label">IP del servidor</p><p class="server-ip-value">Próximamente</p></div></div>
      </div>
    </div>
    <p class="footer-giant" aria-hidden="true">DESAFIO XTREMO</p>
    <div class="footer-bottom">
      <p>© 2026 Desafio Xtremo. No es un producto oficial de Minecraft. No está aprobado por Mojang ni Microsoft, ni asociado con ellos.</p>
      <p>Hecho a mano por el equipo.</p>
    </div>
  </div>
</footer>`;

const BACKDROP = `<a class="skip-link" href="#main">Saltar al contenido</a>
<div class="scroll-progress" aria-hidden="true"></div>
<div class="backdrop" aria-hidden="true"></div>
<canvas id="dust" aria-hidden="true"></canvas>
<div class="grain" aria-hidden="true"></div>`;

const HEART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z"/></svg>';

function notFound() {
  const html = `<!DOCTYPE html>
<html lang="es" class="no-js">
<head>
<title>Anuncio no encontrado · Desafio Xtremo</title>
<meta name="robots" content="noindex">
${HEAD}
</head>
<body>
${BACKDROP}
${NAV}
<main id="main">
  <section class="page-head">
    <div class="container">
      <p class="eyebrow">Error 404</p>
      <h1>Te has perdido<br>en la niebla.</h1>
      <p>Este anuncio no existe o se ha retirado. Vuelve al diario para ver las últimas novedades.</p>
      <p style="margin-top:28px"><a class="btn btn-primary" href="/anuncios.html">Ver todos los anuncios</a></p>
    </div>
  </section>
</main>
${FOOTER}
<script src="/js/site.js"></script>
<script src="/js/motion.js"></script>
</body>
</html>`;
  return new Response(html, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export const onRequestGet = withQuotaHandling(async (context) => {
  const { request, env, params } = context;

  const { post } = await cachedPublicJson(context, request.url, 120, async () => {
    const post = await d1First(
      env,
      `SELECT a.*, (SELECT COUNT(*) FROM announcement_likes l WHERE l.announcement_id = a.id) AS likes
       FROM announcements a WHERE a.slug = ?`,
      [params.slug]
    );
    return { post };
  }).then((res) => res.clone().json());

  if (!post) return notFound();

  if (isCountableView(request)) {
    // Best-effort and off the critical path: a failed counter update must
    // never break or slow down the page itself.
    const bump = d1Run(env, 'UPDATE announcements SET views = views + 1 WHERE id = ?', [post.id]).catch(() => {});
    if (context.waitUntil) context.waitUntil(bump);
    else await bump;
  }

  const origin = new URL(request.url).origin;
  const url = `${origin}/anuncios/${encodeURIComponent(post.slug)}`;
  const title = escapeHtml(post.title);
  const excerpt = escapeHtml(post.excerpt || '');
  const heroUrl = post.hero_image_url ? escapeHtml(post.hero_image_url) : '';
  const ogImage = heroUrl || `${origin}/assets/banner.png`;
  const category = escapeHtml(post.category || 'Anuncio');
  const published = toDate(post.created_at);
  const mins = readingTime(post.body);
  const likes = Number(post.likes) || 0;
  const id = Number(post.id);

  const html = `<!DOCTYPE html>
<html lang="es" class="no-js">
<head>
<title>${title} · Desafio Xtremo</title>
<meta name="description" content="${excerpt}">
<link rel="canonical" href="${escapeHtml(url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Desafio Xtremo">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${excerpt}">
<meta property="og:image" content="${ogImage}">
<meta property="og:url" content="${escapeHtml(url)}">
${published ? `<meta property="article:published_time" content="${published.toISOString()}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${excerpt}">
<meta name="twitter:image" content="${ogImage}">
${HEAD}
</head>
<body class="page-post">
${BACKDROP}
${NAV}
<main id="main">
  <article class="post" data-post-id="${id}" data-slug="${escapeHtml(post.slug)}">
    <div class="container">
      <div class="post-wrap">
        <a href="/anuncios.html" class="post-back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>Volver a los anuncios</a>
        <div class="post-meta" data-reveal="up">
          <span class="category-pill">${category}</span>
          ${published ? `<time datetime="${published.toISOString()}">${escapeHtml(formatDate(post.created_at))}</time>` : ''}
          <span>${mins} min de lectura</span>
        </div>
        <h1 class="post-title" data-split>${title}</h1>
        ${excerpt ? `<p class="post-dek" data-reveal="up" data-delay="0.1">${excerpt}</p>` : ''}
        <div class="post-actions" data-reveal="up" data-delay="0.15">
          <span class="stat" title="Visitas"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>${Number(post.views) || 0}</span>
          <button type="button" class="like-btn" data-like-id="${id}" aria-pressed="false" aria-label="Me gusta">${HEART}<span class="like-count">${likes}</span></button>
          <button type="button" class="btn btn-ghost btn-sm share-btn" data-share="${escapeHtml(url)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/></svg>
            Compartir
          </button>
        </div>
      </div>
      ${heroUrl ? `<figure class="post-hero" data-reveal="scale"><img src="${heroUrl}" alt="" fetchpriority="high"></figure>` : ''}
      <div class="md-content post-body">${post.body || ''}</div>
      <aside class="post-end">
        <p>¿Te ha gustado?</p>
        <button type="button" class="like-btn" data-like-id="${id}" aria-pressed="false" aria-label="Me gusta">${HEART}<span class="like-count">${likes}</span></button>
      </aside>
    </div>
  </article>
  <section class="post-related" id="post-related" hidden>
    <div class="container">
      <h2>Más del diario</h2>
      <div class="posts-grid" id="related-grid"></div>
    </div>
  </section>
</main>
${FOOTER}
<script src="/js/site.js"></script>
<script src="/js/motion.js"></script>
<script src="/js/analytics.js"></script>
<script src="/js/posts.js"></script>
<script src="/js/post.js"></script>
</body>
</html>`;

  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' } });
});
