-- Informes de fallo que manda el launcher cuando el juego se cierra con un error.
-- El texto (registros del juego) va al bucket privado EVIDENCE; aquí solo el índice.
CREATE TABLE IF NOT EXISTS informes_fallo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT,
  version_launcher TEXT,
  sistema TEXT,
  resumen TEXT,
  r2_key TEXT NOT NULL,
  tamano INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
