-- Integración con dx-staff: las sanciones puestas dentro del juego se copian aquí
-- (el proxy las manda firmadas) y conviven con las registradas a mano en el panel.
ALTER TABLE sanctions ADD COLUMN origen TEXT NOT NULL DEFAULT 'web';
ALTER TABLE sanctions ADD COLUMN externo_id INTEGER;
ALTER TABLE sanctions ADD COLUMN target_uuid TEXT;
ALTER TABLE sanctions ADD COLUMN servidor TEXT;
ALTER TABLE sanctions ADD COLUMN plantilla TEXT;
ALTER TABLE sanctions ADD COLUMN expires_at TEXT;
ALTER TABLE sanctions ADD COLUMN revocada_at TEXT;
ALTER TABLE sanctions ADD COLUMN revocada_por TEXT;
ALTER TABLE sanctions ADD COLUMN revocada_motivo TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sanctions_externo ON sanctions(origen, externo_id);

-- Staff conectado ahora mismo (lo reemplaza el proxy cada minuto).
CREATE TABLE IF NOT EXISTS staff_online (
  uuid TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  servidor TEXT,
  desde INTEGER,
  vanish INTEGER NOT NULL DEFAULT 0,
  modo_staff INTEGER NOT NULL DEFAULT 0
);
