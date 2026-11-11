-- Estado del servidor que publica el proxy (DX Login) para el launcher:
-- por ahora, si el Desafío está abierto o cerrado. Clave/valor para poder añadir
-- más avisos (p. ej. la espera tras morir) sin otra migración.
CREATE TABLE IF NOT EXISTS servidor_estado (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
