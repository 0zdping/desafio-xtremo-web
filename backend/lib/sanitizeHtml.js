/** Allowlist-based HTML sanitizer for user-authored rich content (the Quill
 *  editor's announcement body, and any raw HTML an editor slips into a wiki
 *  page's Markdown source).
 *
 *  Why this exists: the client already runs DOMPurify before submitting
 *  (see frontend/js/admin.js) and wiki pages re-sanitize with DOMPurify at
 *  render time (frontend/js/wiki.js), but both of those are client-side
 *  and only advisory. Anyone with a stolen session + CSRF token (e.g. via
 *  another XSS, or a compromised Discord account) can call these admin
 *  endpoints directly with curl/fetch and skip the browser, and the
 *  client-side DOMPurify call itself silently no-ops if the CDN script
 *  failed to load (see the `window.DOMPurify ? ... : rawHtml` fallback in
 *  admin.js). Content stored here is rendered for *every visitor* of the
 *  public site (functions/anuncios/[slug].js renders it server-side with
 *  zero escaping, by design, since it's meant to be rich HTML), so the
 *  real security boundary has to live on the server, not just in the
 *  editor's browser.
 *
 *  The Workers/Pages Functions runtime has no DOM, so DOMPurify can't run
 *  here directly, but the runtime does provide a native HTMLRewriter,
 *  which parses real HTML (not regex/string matching) and lets us walk it
 *  as a proper element tree. We use it as a strict allowlist: only a small
 *  set of tags survive (matching what the Quill toolbar in admin.js can
 *  actually produce), every attribute is stripped unless explicitly
 *  allowed, and `on*`/`style` attributes and `javascript:`/`data:`(non-image)
 *  URLs are always rejected regardless of tag. */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'span', 'pre', 'code', 'hr', 'sub', 'sup',
]);

// Tags whose *content* is also unsafe to keep (script bodies, stylesheet
// rules, embedded documents/forms): removed entirely, not just unwrapped.
const STRIP_WITH_CONTENT = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'noscript', 'svg', 'math',
  'template', 'link', 'meta', 'base', 'form', 'input', 'button', 'textarea',
  'select', 'video', 'audio', 'source', 'title', 'head',
  // Raw-text elements: their content is not parsed as markup, so unwrapping
  // them would let "<xmp><img onerror=...></xmp>" come out as live HTML.
  'xmp', 'noembed', 'noframes', 'plaintext', 'frame', 'frameset', 'applet', 'param', 'portal',
]);

// Everything else not listed here gets every attribute stripped.
const ALLOWED_ATTRS = {
  a: new Set(['href']),
  img: new Set(['src', 'alt']),
};

function isSafeHref(value) {
  const v = (value || '').trim();
  if (!v) return false;
  if (/^(https?:|mailto:)/i.test(v)) return true;
  if (v.startsWith('/') && !v.startsWith('//') && !v.includes('\\')) return true; // site-relative only
  return false;
}

function isSafeImageSrc(value) {
  const v = (value || '').trim();
  if (!v) return false;
  if (/^https?:/i.test(v)) return true;
  if (v.startsWith('/') && !v.startsWith('//')) return true;
  if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(v)) return true;
  return false;
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/** Sanitizes an HTML fragment down to a safe allowlisted subset. Never
 *  throws: on any unexpected failure (including the very unlikely case of
 *  HTMLRewriter being unavailable) it fails closed to plain escaped text
 *  rather than ever storing/serving raw, unsanitized HTML. */
export async function sanitizeHtml(html) {
  if (!html) return '';
  if (typeof HTMLRewriter === 'undefined') {
    return `<p>${escapeHtml(html)}</p>`;
  }

  try {
    const rewriter = new HTMLRewriter().on('*', {
      element(el) {
        const tag = el.tagName.toLowerCase();

        if (STRIP_WITH_CONTENT.has(tag)) {
          el.remove();
          return;
        }
        if (!ALLOWED_TAGS.has(tag)) {
          el.removeAndKeepContent();
          return;
        }

        const allowedAttrs = ALLOWED_ATTRS[tag] || new Set();
        for (const [name] of [...el.attributes]) {
          if (!allowedAttrs.has(name.toLowerCase())) {
            el.removeAttribute(name);
          }
        }

        if (tag === 'a') {
          const href = el.getAttribute('href');
          if (!isSafeHref(href)) el.removeAttribute('href');
          // Force safe defaults on every surviving link regardless of what
          // the editor set: closes tabnabbing via a stripped `rel`.
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener noreferrer nofollow ugc');
        }
        if (tag === 'img') {
          const src = el.getAttribute('src');
          if (!isSafeImageSrc(src)) el.removeAttribute('src');
        }
      },
    });

    const res = rewriter.transform(new Response(html));
    return await res.text();
  } catch (err) {
    console.error('sanitizeHtml failed, falling back to escaped plain text', err);
    return `<p>${escapeHtml(html)}</p>`;
  }
}

/** Lighter-touch backstop for wiki pages, whose stored `content` is
 *  Markdown *source*, not HTML, rendered client-side via marked() (which
 *  passes raw inline HTML straight through by default) and then DOMPurify
 *  (frontend/js/wiki.js), again only advisory for the same reasons as
 *  above. Unlike sanitizeHtml(), this does NOT unwrap/allowlist tags
 *  (Markdown authors may legitimately type `<div>`/`<table>`/etc. either
 *  as intentional raw HTML or inside a fenced code block documenting some
 *  markup, and destructively unwrapping those would corrupt real content).
 *  It only ever removes what's actually capable of executing script:
 *  script/iframe/object/embed/style/form-like tags and their content, any
 *  `on*` event-handler attribute on any element, `javascript:` URLs, and
 *  inline `style` (which can smuggle `expression()`/`url(javascript:)` in
 *  older engines and has no legitimate use in a Markdown wiki page). */
export async function stripDangerousHtml(html) {
  if (!html) return '';
  if (typeof HTMLRewriter === 'undefined') {
    return escapeHtml(html);
  }

  try {
    const rewriter = new HTMLRewriter().on('*', {
      element(el) {
        const tag = el.tagName.toLowerCase();
        if (STRIP_WITH_CONTENT.has(tag)) {
          el.remove();
          return;
        }
        for (const [name, value] of [...el.attributes]) {
          const lower = name.toLowerCase();
          if (lower.startsWith('on') || lower === 'style') {
            el.removeAttribute(name);
            continue;
          }
          if (lower === 'href' || lower === 'src' || lower === 'action' || lower === 'formaction') {
            const v = (value || '').trim();
            const isJs = /^\s*javascript:/i.test(v);
            const isDataNonImage = /^\s*data:/i.test(v) && !/^\s*data:image\//i.test(v);
            if (isJs || isDataNonImage) el.removeAttribute(name);
          }
        }
      },
    });

    const res = rewriter.transform(new Response(html));
    return await res.text();
  } catch (err) {
    console.error('stripDangerousHtml failed, falling back to escaped plain text', err);
    return escapeHtml(html);
  }
}
