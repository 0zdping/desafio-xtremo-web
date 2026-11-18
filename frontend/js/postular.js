/* /postular: postulaciones a Staff y al Equipo de Desarrollo. */
(function () {
  const DX = window.DX;
  const esc = DX.escapeHtml;
  const root = document.getElementById('pz-root');
  const ESTADO = { pendiente: 'Pendiente', en_revision: 'En revisión', aceptada: 'Aceptada', rechazada: 'No seleccionada' };
  const MAX = { corto: 200, largo: 2000 };
  let datos = null;
  let csrf = '';

  async function cargar() {
    try {
      const r = await fetch('/api/postulaciones', { credentials: 'include' });
      datos = await r.json();
      if (!r.ok) throw new Error(datos.error || 'Error');
      pintar();
    } catch {
      root.innerHTML = '<p class="pz-nota">No se pudieron cargar las postulaciones. Recarga la página en un momento.</p>';
    }
  }

  function activa(slug) {
    return (datos.mias || []).find((m) => m.puesto === slug && (m.estado === 'pendiente' || m.estado === 'en_revision'));
  }

  function pintar() {
    const nombres = Object.fromEntries(datos.puestos.map((p) => [p.slug, p.nombre]));
    const cartas = datos.puestos
      .map((p) => {
        let accion = '';
        if (!p.abierta) accion = '<span class="pz-nota">Ahora mismo no buscamos gente para este puesto.</span>';
        else if (!datos.sesion) accion = `<a class="btn btn-discord" href="${esc(DX.loginUrl())}">Inicia sesión con Discord para postularte</a>`;
        else if (activa(p.slug)) accion = '<span class="pz-nota">Ya tienes una postulación en revisión.</span>';
        else accion = `<button class="btn btn-primary" type="button" data-postular="${esc(p.slug)}">Postularme</button>`;
        return `<article class="pz-card">
          <span class="pz-estado${p.abierta ? ' abierta' : ''}">${p.abierta ? 'Abierta' : 'Cerrada'}</span>
          <h2>${esc(p.nombre)}</h2>
          <p>${esc(p.descripcion)}</p>
          ${accion}
        </article>`;
      })
      .join('');
    const mias = (datos.mias || [])
      .map((m) => `<div class="pz-mia">
          <b>${esc(nombres[m.puesto] || m.puesto)}</b>
          <span class="pz-badge ${esc(m.estado)}">${esc(ESTADO[m.estado] || m.estado)}</span>
          <small>Enviada ${esc(DX.relTime(m.created_at))}</small>
          ${m.respuesta ? `<p class="pz-resp">${esc(m.respuesta)}</p>` : ''}
        </div>`)
      .join('');
    root.innerHTML = `<div class="pz-grid">${cartas}</div>
      ${mias ? `<h2 class="pz-h">Tus postulaciones</h2><div class="pz-mias">${mias}</div>` : ''}`;
    root.querySelectorAll('[data-postular]').forEach((b) => b.addEventListener('click', () => formulario(b.dataset.postular)));
  }

  function formulario(slug) {
    const p = datos.puestos.find((x) => x.slug === slug);
    if (!p) return;
    const mc = datos.mc
      ? `<p class="pz-nota">Tu cuenta de Minecraft vinculada (<b>${esc(datos.mc)}</b>) se adjunta sola.</p>`
      : '<p class="pz-nota">Si vinculas tu cuenta de Minecraft con el launcher, se adjunta sola a la postulación. No es obligatorio.</p>';
    root.innerHTML = `<form class="pz-form" novalidate>
      <h2>Postulación: ${esc(p.nombre)}</h2>
      ${mc}
      ${p.preguntas
        .map((q) => {
          const id = 'q-' + q.id;
          const max = MAX[q.tipo] || MAX.largo;
          const campo = q.tipo === 'corto'
            ? `<input type="text" id="${esc(id)}" name="${esc(q.id)}" maxlength="${max}" ${q.obligatoria ? 'required' : ''}>`
            : `<textarea id="${esc(id)}" name="${esc(q.id)}" maxlength="${max}" rows="5" ${q.obligatoria ? 'required' : ''}></textarea>`;
          return `<div class="field"><label for="${esc(id)}">${esc(q.texto)}${q.obligatoria ? '' : ' <small>(opcional)</small>'}</label>${campo}<span class="field-hint" data-max="${max}">0/${max}</span></div>`;
        })
        .join('')}
      <p class="pz-error" role="alert" hidden></p>
      <div class="pz-acc">
        <button class="btn btn-primary" type="submit">Enviar postulación</button>
        <button class="btn btn-ghost" type="button" data-volver>Cancelar</button>
      </div>
      <p class="pz-nota">Solo puedes tener una postulación activa por puesto. Te responderemos en esta misma página.</p>
    </form>`;
    const f = root.querySelector('form');
    const err = f.querySelector('.pz-error');
    f.querySelectorAll('input,textarea').forEach((el) => {
      const hint = el.parentElement.querySelector('.field-hint');
      el.addEventListener('input', () => (hint.textContent = `${el.value.length}/${hint.dataset.max}`));
    });
    f.querySelector('[data-volver]').addEventListener('click', pintar);
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.hidden = true;
      const respuestas = {};
      for (const q of p.preguntas) {
        const v = f.elements[q.id].value.trim();
        if (q.obligatoria && !v) {
          err.textContent = `Falta responder: «${q.texto}»`;
          err.hidden = false;
          f.elements[q.id].focus();
          return;
        }
        respuestas[q.id] = v;
      }
      const btn = f.querySelector('[type="submit"]');
      btn.disabled = true;
      try {
        const r = await fetch('/api/postulaciones', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          body: JSON.stringify({ puesto: slug, respuestas }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'No se pudo enviar.');
        DX.toast ? DX.toast('¡Postulación enviada! Te responderemos aquí.') : null;
        await cargar();
      } catch (ex) {
        err.textContent = ex.message;
        err.hidden = false;
        btn.disabled = false;
      }
    });
  }

  DX.me.then((s) => {
    csrf = (s && s.csrfToken) || '';
    cargar();
  });
})();
