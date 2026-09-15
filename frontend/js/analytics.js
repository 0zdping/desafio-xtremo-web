/* Cookieless page-view + link-click beacon for the public site. Never sets a
 * cookie or reads localStorage — the server derives a daily-rotating,
 * non-reversible visitor hash from IP+UA (see backend/lib/analytics.js), so
 * this needs no consent banner. Events are queued and sent in one batched
 * request instead of one request per interaction, since every write against
 * D1 also costs a write against the site's shared KV quota bookkeeping. */
(function () {
  if (navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes') return;

  var queue = [];
  var flushTimer = null;

  function push(evt) {
    queue.push(evt);
    if (!flushTimer) flushTimer = setTimeout(function () { flush(false); }, 2000);
  }

  function flush(useBeacon) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (!queue.length) return;
    var payload = JSON.stringify({ events: queue, ref: document.referrer || '' });
    queue = [];
    try {
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(function () {});
      }
    } catch (err) {}
  }

  push({ type: 'pageview', path: location.pathname });

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
    var label;
    try {
      var u = new URL(href, location.href);
      label = u.hostname === location.hostname ? u.pathname : u.hostname;
    } catch (err) {
      label = href.slice(0, 100);
    }
    push({ type: 'click', path: location.pathname, target: label });
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) flush(true);
  });
  window.addEventListener('pagehide', function () {
    flush(true);
  });
})();
