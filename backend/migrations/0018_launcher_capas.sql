-- Launcher 0.14: capas exclusivas que se dan desde el panel (solo los owners).
-- Una fila = este nombre de Minecraft puede llevar esta capa. DX Models comprueba esta lista
-- (GET /api/launcher/capas) antes de enseñar la capa a los demás jugadores.
CREATE TABLE IF NOT EXISTS launcher_capas (
  nombre TEXT NOT NULL COLLATE NOCASE,
  capa TEXT NOT NULL,
  dado_por TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (nombre, capa)
);
