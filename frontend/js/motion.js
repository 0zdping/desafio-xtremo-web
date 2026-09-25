/* ==========================================================================
   motion.js · tiny scroll-animation engine (no dependencies)

   - [data-reveal="up|left|right|scale|blur|clip"]  one-shot reveal when the
     element enters the viewport (IntersectionObserver). [data-delay="0.2"]
     staggers it.
   - [data-split]  splits a heading into masked words that rise in on reveal
     (keeps inner markup such as <span class="accent">).
   - [data-scene="pin|view"]  writes a live --p (0..1) CSS variable on the
     element every frame it is scrolled:
        pin  = progress through a tall section whose child is position:sticky
        view = progress from "entering the bottom" to "leaving the top"
     Other scripts can subscribe with DXMotion.onScene(el, fn).
   - [data-fill]  paragraph whose words light up one by one as it scrolls
     through the middle of the screen.
   - [data-count="12"]  number that counts up once when revealed.
   - [data-scramble]  text that decodes from random glyphs once when revealed.

   Everything degrades to a static, fully visible page without JS (the
   <html class="no-js"> hook) and respects prefers-reduced-motion.
   ========================================================================== */
(function () {
  const root = document.documentElement;
  root.classList.remove('no-js');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) root.classList.add('reduced-motion');

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

  /* ---------- split words (preserves child elements) ---------- */
  function splitWords(el, cls) {
    if (el.dataset.splitDone) return [];
    el.dataset.splitDone = '1';
    const words = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const parts = node.textContent.split(/(\s+)/);
      if (parts.length === 1 && !parts[0].trim()) return;
      const frag = document.createDocumentFragment();
      parts.forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
          return;
        }
        const outer = document.createElement('span');
        outer.className = cls;
        const inner = document.createElement('span');
        inner.textContent = part;
        inner.style.setProperty('--i', words.length);
        outer.appendChild(inner);
        frag.appendChild(outer);
        words.push(outer);
      });
      node.parentNode.replaceChild(frag, node);
    });
    return words;
  }

  /* ---------- reveal ---------- */
  const revealIO =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (!e.isIntersecting) return;
              const el = e.target;
              el.classList.add('is-in');
              revealIO.unobserve(el);
              if (el.hasAttribute('data-count')) countUp(el);
              if (el.hasAttribute('data-scramble')) scramble(el);
              el.dispatchEvent(new CustomEvent('dx:reveal'));
            });
          },
          { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
        )
      : null;

  function bindReveals(scope) {
    const base = scope || document;
    base.querySelectorAll('[data-split]:not([data-split-done])').forEach((el) => {
      splitWords(el, 'split-word');
      if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', '');
    });
    base.querySelectorAll('[data-reveal],[data-count],[data-scramble]').forEach((el) => {
      if (el.dataset.revealBound) return;
      el.dataset.revealBound = '1';
      if (el.dataset.delay) el.style.setProperty('--d', el.dataset.delay + 's');
      if (!revealIO || reduced) {
        el.classList.add('is-in');
        if (el.hasAttribute('data-count')) el.textContent = formatCount(el, Number(el.dataset.count));
        return;
      }
      if (el.hasAttribute('data-scramble')) el.dataset.scrambleText = el.textContent;
      revealIO.observe(el);
    });
  }

  /* ---------- count up ---------- */
  function formatCount(el, v) {
    return (el.dataset.prefix || '') + Math.round(v).toLocaleString('es-ES') + (el.dataset.suffix || '');
  }
  function countUp(el) {
    const target = Number(el.dataset.count) || 0;
    const dur = 1400;
    const t0 = performance.now();
    function step(t) {
      const k = clamp((t - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 4);
      el.textContent = formatCount(el, target * eased);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- scramble / decode ---------- */
  const GLYPHS = '█▓▒░<>/\\#$%&*+=?ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  function scramble(el) {
    const final = el.dataset.scrambleText || el.textContent;
    const len = final.length;
    const t0 = performance.now();
    const dur = 700 + len * 22;
    function step(t) {
      const k = clamp((t - t0) / dur);
      let out = '';
      for (let i = 0; i < len; i++) {
        const ch = final[i];
        if (ch === ' ' || i / len < k) out += ch;
        else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (k < 1) requestAnimationFrame(step);
      else el.textContent = final;
    }
    requestAnimationFrame(step);
  }

  /* ---------- scenes (scroll-linked progress) ---------- */
  const scenes = [];
  const handlers = new WeakMap();
  const fills = [];

  function bindScenes() {
    document.querySelectorAll('[data-scene]').forEach((el) => {
      if (el.dataset.sceneBound) return;
      el.dataset.sceneBound = '1';
      scenes.push({ el, mode: el.dataset.scene || 'view', last: -1 });
    });
    document.querySelectorAll('[data-fill]').forEach((el) => {
      if (el.dataset.fillBound) return;
      el.dataset.fillBound = '1';
      const words = splitWords(el, 'fill-word');
      fills.push({ el, words, lit: -1 });
    });
  }

  function onScene(el, fn) {
    if (!handlers.has(el)) handlers.set(el, []);
    handlers.get(el).push(fn);
  }

  const scrollHandlers = [];
  function onScroll(fn) {
    scrollHandlers.push(fn);
  }

  let ticking = false;
  let lastY = window.scrollY;
  function frame() {
    ticking = false;
    const vh = window.innerHeight;
    const y = window.scrollY;
    const dir = y > lastY ? 1 : y < lastY ? -1 : 0;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    root.style.setProperty('--scroll', (y / maxScroll).toFixed(4));
    scrollHandlers.forEach((fn) => fn({ y, dir, vh, progress: y / maxScroll }));
    lastY = y;

    for (const s of scenes) {
      const r = s.el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) continue; // far off-screen: skip work
      let p;
      if (s.mode === 'pin') {
        const total = r.height - vh;
        p = total > 0 ? clamp(-r.top / total) : clamp((vh - r.top) / (vh + r.height));
      } else {
        p = clamp((vh - r.top) / (vh + r.height));
      }
      if (Math.abs(p - s.last) < 0.0005) continue;
      s.last = p;
      s.el.style.setProperty('--p', p.toFixed(4));
      const hs = handlers.get(s.el);
      if (hs) hs.forEach((fn) => fn(p, r));
    }

    for (const f of fills) {
      const r = f.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      // lights from "top of text at 85% of the screen" to "bottom at 45%"
      const start = vh * 0.85;
      const end = vh * 0.45;
      const k = clamp((start - r.top) / (start - end + r.height * 0.6));
      const lit = Math.round(k * f.words.length);
      if (lit === f.lit) continue;
      f.lit = lit;
      f.words.forEach((w, i) => w.classList.toggle('lit', i < lit));
    }
  }
  function requestFrame() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  }

  function init() {
    bindReveals();
    bindScenes();
    if (reduced) fills.forEach((f) => f.words.forEach((w) => w.classList.add('lit')));
    window.addEventListener('scroll', requestFrame, { passive: true });
    window.addEventListener('resize', requestFrame);
    requestFrame();
  }

  window.DXMotion = {
    reduced,
    clamp,
    onScene,
    onScroll,
    refresh() {
      bindReveals();
      bindScenes();
      requestFrame();
    },
    splitWords,
    scramble,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
