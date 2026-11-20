-- Launcher 1.4 / DXAirdrops: cosméticos del launcher que se consiguen con un cupón de airdrop.
-- Una fila = un cupón canjeado (el código del cupón es único: cada cupón vale una vez).
-- Un jugador tiene un cosmético si tiene al menos una fila con él. Lo escribe SOLO DXAirdrops (petición firmada con
-- DX_AIRDROPS_PUBLICA) y lo leen el launcher (para ofrecerlo) y DX Models (para enseñarlo a los demás).
CREATE TABLE IF NOT EXISTS launcher_cosmeticos (
  codigo TEXT PRIMARY KEY,
  nombre TEXT NOT NULL COLLATE NOCASE,
  uuid TEXT NOT NULL,
  cosmetico TEXT NOT NULL,
  origen TEXT NOT NULL DEFAULT 'airdrop',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_launcher_cosmeticos_nombre ON launcher_cosmeticos (nombre);
CREATE INDEX IF NOT EXISTS idx_launcher_cosmeticos_cosmetico ON launcher_cosmeticos (cosmetico);
