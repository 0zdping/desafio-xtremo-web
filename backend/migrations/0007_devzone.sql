-- Dev Zone: espacio interno solo para el rango Developer (no Builder, no Staff
-- salvo Owner/Co-Owner que ya tienen todos los permisos). Tres piezas, pensadas
-- para el problema real detectado el 2026-09-20 (trabajo duplicado por falta de
-- visibilidad entre developers): registro de decisiones, specs por sistema
-- (espejo dev-facing del Google Doc de diseño), y tablero de tareas.

CREATE TABLE devzone_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  system TEXT NOT NULL DEFAULT 'general',
  author_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_devzone_decisions_system ON devzone_decisions(system);

CREATE TABLE devzone_specs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  system TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL DEFAULT '',
  source_note TEXT NOT NULL DEFAULT '',
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE devzone_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  system TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'no_iniciado' CHECK (status IN ('no_iniciado','en_proceso','en_espera','terminado')),
  assignee_id TEXT,
  repo TEXT NOT NULL DEFAULT '',
  blocked_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_devzone_tasks_status ON devzone_tasks(status);
CREATE INDEX idx_devzone_tasks_assignee ON devzone_tasks(assignee_id);

INSERT INTO permissions (key, label, description) VALUES
  ('devzone.access', 'Acceder a Dev Zone', 'Ver decisiones, specs y tareas del equipo de desarrollo'),
  ('devzone.manage', 'Gestionar Dev Zone', 'Crear/editar decisiones, specs y tareas en Dev Zone');

-- Todo el rango Developer puede leer Y escribir: es una herramienta de equipo
-- pequeño (3-4 personas), no una jerarquía editor/lector como la wiki pública.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN ('devzone.access','devzone.manage')
WHERE r.name = 'Developer';

-- Owner/Co-Owner ya tienen todos los permisos vía el CROSS JOIN de 0001, pero ese
-- CROSS JOIN corrió antes de que estos dos permisos existieran.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name IN ('Owner','Co-Owner') AND p.key IN ('devzone.access','devzone.manage');
