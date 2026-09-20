-- Corrige devzone_tasks: el CHECK de `status` de la migracion 0007 se corrompio
-- al pegarlo en la consola D1 (quedo como un unico valor literal
-- 'no_iniciadoerminado' en vez de los 4 estados), asi que TODO insert fallaba,
-- incluido el valor por defecto. La tabla estaba vacia (ningun insert llego a
-- persistir), asi que se recrea entera en vez de migrar datos.
DROP TABLE IF EXISTS devzone_tasks;

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
