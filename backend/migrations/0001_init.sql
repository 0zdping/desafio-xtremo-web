CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT,
  avatar TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#a6afc7',
  position INTEGER NOT NULL DEFAULT 0,
  is_locked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT
);

CREATE TABLE role_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);

INSERT INTO permissions (key, label, description) VALUES
  ('panel.access', 'Acceder al panel', 'Puede entrar al panel de administración/staff'),
  ('panel.manage_roles', 'Gestionar rangos', 'Puede crear, editar, eliminar rangos y asignarlos a usuarios'),
  ('panel.view_usage', 'Ver uso de recursos', 'Puede ver el monitor de uso de las bases de datos');

INSERT INTO roles (name, color, position, is_locked) VALUES
  ('Owner', '#facc15', 100, 1),
  ('Co-Owner', '#a855f7', 90, 1);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name IN ('Owner', 'Co-Owner');

INSERT INTO users (id, username) VALUES
  ('793181383497220116', NULL),
  ('761238124470337576', NULL);

INSERT INTO user_roles (user_id, role_id)
SELECT '793181383497220116', id FROM roles WHERE name = 'Owner';

INSERT INTO user_roles (user_id, role_id)
SELECT '761238124470337576', id FROM roles WHERE name = 'Co-Owner';
