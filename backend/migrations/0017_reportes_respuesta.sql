-- Launcher 0.11: el staff puede responder a los reportes (también ya resueltos) y quien reporta
-- ve en el launcher el estado y la respuesta. novedad = 1: hay algo que el autor no ha visto.
ALTER TABLE reportes ADD COLUMN respuesta TEXT;
ALTER TABLE reportes ADD COLUMN respuesta_por TEXT;
ALTER TABLE reportes ADD COLUMN respuesta_at TEXT;
ALTER TABLE reportes ADD COLUMN novedad INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_reportes_autor ON reportes(autor_user_id, created_at);
