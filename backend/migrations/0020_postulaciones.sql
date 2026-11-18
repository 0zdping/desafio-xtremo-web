-- Postulaciones a Staff y al Equipo de Desarrollo desde la web (antes por Discord).
-- Dos tablas: los puestos (abiertos o no, con sus preguntas editables desde el panel)
-- y las postulaciones de cada persona. Los puestos nacen CERRADOS: los owners revisan
-- las preguntas en el panel y los abren cuando quieran.

CREATE TABLE IF NOT EXISTS postulacion_puestos (
  slug TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  abierta INTEGER NOT NULL DEFAULT 0,
  -- días que tiene que esperar alguien rechazado antes de volver a postularse
  espera_dias INTEGER NOT NULL DEFAULT 14,
  -- JSON: [{ "id": "por-que", "texto": "...", "tipo": "corto"|"largo", "obligatoria": true }]
  preguntas TEXT NOT NULL DEFAULT '[]',
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS postulaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  puesto TEXT NOT NULL REFERENCES postulacion_puestos(slug),
  -- copia de las preguntas tal como estaban al postularse + respuestas: [{ texto, respuesta }]
  respuestas TEXT NOT NULL,
  mc_nombre TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_revision','aceptada','rechazada')),
  -- lo que ve el postulante
  respuesta TEXT NOT NULL DEFAULT '',
  -- solo para quien revisa
  nota_interna TEXT NOT NULL DEFAULT '',
  revisado_por TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_postulaciones_estado ON postulaciones(estado, created_at);
CREATE INDEX IF NOT EXISTS idx_postulaciones_user ON postulaciones(user_id);
-- Una sola postulación activa por persona y puesto.
CREATE UNIQUE INDEX IF NOT EXISTS idx_postulaciones_activa ON postulaciones(user_id, puesto)
  WHERE estado IN ('pendiente','en_revision');

INSERT OR IGNORE INTO permissions (key, label, description) VALUES
  ('postulaciones.review', 'Revisar postulaciones', 'Ver las postulaciones a Staff y Desarrollo, aceptarlas o rechazarlas'),
  ('postulaciones.manage', 'Gestionar postulaciones', 'Abrir o cerrar puestos y editar sus preguntas');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name IN ('Owner','Co-Owner') AND p.key IN ('postulaciones.review','postulaciones.manage');

-- Preguntas de partida (BORRADOR para que los owners las revisen antes de abrir).
INSERT OR IGNORE INTO postulacion_puestos (slug, nombre, descripcion, abierta, preguntas) VALUES
('staff', 'Staff', 'Moderación del servidor y del Discord: ayudar a los jugadores, hacer cumplir las normas y mantener el buen ambiente.', 0,
 '[{"id":"edad","texto":"¿Cuántos años tienes?","tipo":"corto","obligatoria":true},
   {"id":"horas","texto":"¿Cuántas horas a la semana podrías dedicar y en qué horario sueles estar?","tipo":"corto","obligatoria":true},
   {"id":"experiencia","texto":"¿Has sido staff en otros servidores o comunidades? Cuéntanos dónde y qué hacías.","tipo":"largo","obligatoria":true},
   {"id":"por-que","texto":"¿Por qué quieres ser staff de Desafío Xtremo?","tipo":"largo","obligatoria":true},
   {"id":"caso","texto":"Un jugador insulta a otro en el chat y luego dice que era broma. ¿Qué harías?","tipo":"largo","obligatoria":true},
   {"id":"extra","texto":"¿Algo más que quieras contarnos?","tipo":"largo","obligatoria":false}]'),
('desarrollo', 'Equipo de Desarrollo', 'Crear el Desafío por dentro: plugins, servidor, web, texturas y modelos.', 0,
 '[{"id":"edad","texto":"¿Cuántos años tienes?","tipo":"corto","obligatoria":true},
   {"id":"area","texto":"¿En qué te gustaría ayudar? (plugins en Java, configuración del servidor, web, texturas, modelos, otro)","tipo":"corto","obligatoria":true},
   {"id":"experiencia","texto":"¿Qué experiencia tienes? Lenguajes, herramientas y proyectos en los que hayas trabajado.","tipo":"largo","obligatoria":true},
   {"id":"enlaces","texto":"Enlaces a tu trabajo (GitHub, portfolio, capturas...)","tipo":"largo","obligatoria":false},
   {"id":"horas","texto":"¿Cuántas horas a la semana podrías dedicar?","tipo":"corto","obligatoria":true},
   {"id":"por-que","texto":"¿Por qué quieres entrar al equipo de Desafío Xtremo?","tipo":"largo","obligatoria":true}]');
