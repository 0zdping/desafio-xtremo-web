ALTER TABLE roles ADD COLUMN team TEXT;

CREATE TABLE wiki_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  content TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  author_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mc_nick TEXT NOT NULL,
  rank_label TEXT NOT NULL,
  rank_color TEXT NOT NULL DEFAULT '#6fb3ff',
  function_text TEXT NOT NULL DEFAULT '',
  team TEXT NOT NULL DEFAULT 'staff',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sanctions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_nick TEXT NOT NULL,
  type TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  staff_id TEXT NOT NULL,
  staff_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sanction_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sanction_id INTEGER NOT NULL REFERENCES sanctions(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  content_type TEXT,
  filename TEXT,
  size INTEGER,
  uploaded_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sanction_evidence_sanction ON sanction_evidence(sanction_id);

INSERT INTO permissions (key, label, description) VALUES
  ('wiki.manage', 'Gestionar wiki', 'Crear, editar y eliminar páginas de la wiki'),
  ('announcements.manage', 'Gestionar anuncios', 'Crear, editar y eliminar anuncios'),
  ('team.manage', 'Gestionar equipo', 'Editar la sección de equipo de la web'),
  ('sanctions.access', 'Acceder a sanciones', 'Ver y registrar sanciones con pruebas'),
  ('sanctions.manage', 'Gestionar sanciones', 'Editar/eliminar sanciones de cualquier staff');

UPDATE roles SET team = 'staff' WHERE name IN ('Owner', 'Co-Owner');
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name IN ('Owner','Co-Owner');

INSERT INTO roles (name, color, position, is_locked, team) VALUES
  ('Community Manager', '#f97316', 80, 0, 'staff'),
  ('Admin', '#ef4444', 70, 0, 'staff'),
  ('Mod', '#3ecf7e', 50, 0, 'staff'),
  ('Helper', '#6fb3ff', 30, 0, 'staff'),
  ('Developer', '#38bdf8', 65, 0, 'dev'),
  ('Builder', '#fbbf24', 40, 0, 'dev');

-- Permisos por defecto para los rangos fijos nuevos (no bloqueados: el organizador
-- puede retocar color/posición/permisos de cualquiera de ellos desde el panel).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key = 'panel.access'
WHERE r.name IN ('Community Manager','Admin','Mod','Helper','Developer','Builder');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key = 'sanctions.access'
WHERE r.name IN ('Admin','Mod','Helper');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key = 'sanctions.manage'
WHERE r.name = 'Admin';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN ('wiki.manage','announcements.manage')
WHERE r.name IN ('Community Manager','Admin');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key = 'team.manage'
WHERE r.name = 'Admin';

INSERT INTO team_members (mc_nick, rank_label, rank_color, function_text, team, position) VALUES
  ('Gabo020', 'Owner', '#facc15', 'Fundador y Desarrollador Principal', 'staff', 100),
  ('zdping', 'Co-Owner', '#a855f7', 'Organizador y Desarrollador Principal', 'staff', 90);
