-- Launcher 0.7: jugadores (lo publica el proxy cada 5 minutos), reportes de jugadores
-- desde el launcher y encuestas de la comunidad.

-- Una fila por jugador que ha entrado alguna vez. ultima_vez es la pública (no se mueve
-- mientras el staff está en vanish); ultima_real es solo para el staff.
CREATE TABLE IF NOT EXISTS jugadores (
  uuid TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  nombre_lower TEXT NOT NULL,
  primera_vez TEXT NOT NULL DEFAULT (datetime('now')),
  ultima_vez TEXT,
  ultima_real TEXT,
  ultimo_servidor TEXT,
  minutos INTEGER NOT NULL DEFAULT 0,
  clan_siglas TEXT,
  clan_nombre TEXT
);
CREATE INDEX IF NOT EXISTS idx_jugadores_nombre ON jugadores(nombre_lower);
CREATE INDEX IF NOT EXISTS idx_jugadores_minutos ON jugadores(minutos DESC);

-- Reportes de jugadores mandados desde el launcher (cuenta de la web obligatoria).
CREATE TABLE IF NOT EXISTS reportes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  autor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  autor_nombre TEXT,
  objetivo TEXT NOT NULL,
  motivo TEXT NOT NULL,
  detalle TEXT,
  estado TEXT NOT NULL DEFAULT 'abierto',
  revisado_por TEXT,
  revisado_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reportes_estado ON reportes(estado, created_at);

-- Encuestas (las crea el staff, vota cualquiera con el launcher conectado, un voto por cuenta).
CREATE TABLE IF NOT EXISTS encuestas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pregunta TEXT NOT NULL,
  opciones TEXT NOT NULL,
  abierta INTEGER NOT NULL DEFAULT 1,
  creada_por TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS encuesta_votos (
  encuesta_id INTEGER NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opcion INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (encuesta_id, user_id)
);
