-- Launcher de Desafío Xtremo (repo dx-launcher, docs/SEGURIDAD.md).
-- Todo en D1 y no en KV: KV solo permite 1.000 escrituras al día en el plan gratuito.

-- Sesiones del launcher. Se guarda el sha256 del token, nunca el token.
CREATE TABLE IF NOT EXISTS launcher_sesiones (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used TEXT
);
CREATE INDEX IF NOT EXISTS idx_launcher_sesiones_user ON launcher_sesiones(user_id);

-- Conexión launcher <-> cuenta de la web (dura 10 minutos).
-- codigo va en la URL que abre el navegador; sondeo solo lo conoce el launcher.
CREATE TABLE IF NOT EXISTS launcher_conexiones (
  codigo TEXT PRIMARY KEY,
  sondeo_hash TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  token TEXT,
  expires_at INTEGER NOT NULL
);

-- Nombre de Minecraft vinculado a una cuenta (uno por cuenta, y cada nombre en una sola cuenta).
CREATE TABLE IF NOT EXISTS mc_vinculos (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  nombre_lower TEXT NOT NULL UNIQUE,
  uuid TEXT NOT NULL,
  premium INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Códigos de /vincular (10 minutos, un solo uso).
CREATE TABLE IF NOT EXISTS mc_codigos (
  codigo TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mc_codigos_user ON mc_codigos(user_id);
