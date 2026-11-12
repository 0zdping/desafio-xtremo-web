/* /launcher?c=<código>: el jugador confirma que conecta el launcher a su cuenta. */
(function () {
  const titulo = document.getElementById('lz-titulo');
  const texto = document.getElementById('lz-texto');
  const acciones = document.getElementById('lz-acciones');
  const codigo = new URLSearchParams(location.search).get('c') || '';

  function boton(etiqueta, clase, alPulsar, href) {
    const b = document.createElement(href ? 'a' : 'button');
    b.className = 'btn ' + clase;
    b.textContent = etiqueta;
    if (href) b.href = href; else { b.type = 'button'; b.addEventListener('click', alPulsar); }
    return b;
  }
  function mostrar(t, p, botones) {
    titulo.textContent = t;
    texto.textContent = p;
    acciones.replaceChildren(...(botones || []));
    acciones.hidden = !botones || !botones.length;
  }

  // Sin código: página de descarga. Con código: conectar el launcher a la cuenta.
  if (!codigo) {
    fetch('/api/launcher/version').then((r) => (r.ok ? r.json() : null)).then((v) => {
      if (!v) return;
      const mb = (t) => (t ? ` · ${(t / 1048576).toFixed(0)} MB` : '');
      document.getElementById('lz-ver').textContent = `Versión ${v.version}${mb(v.tamano)}`;
      // Mac (si esta versión lo tiene): botón principal para Mac si se entra desde un Mac.
      const mac = v.mac || {};
      if (!mac.arm64 && !mac.x64) return;
      const enMac = /Macintosh|Mac OS X/.test(navigator.userAgent);
      const boton = document.getElementById('lz-boton');
      const otros = document.getElementById('lz-otros');
      const enlace = (texto, href, clase) => { const a = document.createElement('a'); a.className = clase; a.href = href; a.textContent = texto; return a; };
      const enlaces = [];
      if (enMac) {
        const principal = mac.arm64 || mac.x64;
        boton.href = principal.descarga;
        boton.textContent = mac.arm64 ? 'Descargar para Mac (Apple Silicon)' : 'Descargar para Mac (Intel)';
        if (mac.arm64 && mac.x64) enlaces.push(enlace('Mac con Intel', mac.x64.descarga, 'btn btn-ghost'));
        enlaces.push(enlace('Windows', v.descarga, 'btn btn-ghost'));
        document.getElementById('lz-nota-win').hidden = true;
        document.getElementById('lz-nota-mac').hidden = false;
      } else {
        if (mac.arm64) enlaces.push(enlace('Mac (Apple Silicon)', mac.arm64.descarga, 'btn btn-ghost'));
        if (mac.x64) enlaces.push(enlace('Mac (Intel)', mac.x64.descarga, 'btn btn-ghost'));
      }
      otros.replaceChildren(...enlaces);
      otros.hidden = !enlaces.length;
    }).catch(() => {});
    fetch('/api/launcher/servidor').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d && d.previsto) document.getElementById('lz-previsto').textContent = d.previsto;
    }).catch(() => {});
    return;
  }
  document.getElementById('lz-descarga').hidden = true;
  document.getElementById('lz-pasos').hidden = true;
  document.getElementById('lz-conectar').hidden = false;
  if (!/^[A-Za-z0-9_-]{32}$/.test(codigo)) {
    mostrar('Enlace no válido', 'Abre este enlace desde el botón Conectar del launcher.');
    return;
  }

  window.DX.me.then(({ user, csrfToken }) => {
    if (!user) {
      const vuelta = encodeURIComponent('/launcher?c=' + codigo);
      mostrar('Conectar el launcher', 'Primero inicia sesión con tu cuenta de Discord.', [
        boton('Iniciar sesión con Discord', 'btn-discord', null, '/api/auth/login?return_to=' + vuelta),
      ]);
      return;
    }
    mostrar('Conectar el launcher', `Vas a conectar el launcher de Desafío Xtremo a tu cuenta ${user.username}.`, [
      boton('Conectar', 'btn-primary', async (e) => {
        e.currentTarget.disabled = true;
        try {
          const r = await fetch('/api/launcher/conectar/confirmar', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken || '' },
            body: JSON.stringify({ codigo }),
          });
          const d = await r.json().catch(() => ({}));
          if (!r.ok) { mostrar('No se pudo conectar', d.error || 'Inténtalo de nuevo desde el launcher.'); return; }
          mostrar('¡Listo!', 'El launcher ya está conectado a tu cuenta. Puedes cerrar esta pestaña y volver a él.');
        } catch {
          mostrar('No se pudo conectar', 'Revisa tu conexión e inténtalo de nuevo.');
        }
      }),
      boton('Cancelar', 'btn-ghost', null, '/'),
    ]);
  });
})();
