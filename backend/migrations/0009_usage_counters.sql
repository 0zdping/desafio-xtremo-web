-- Contadores de cuota propios (backend/lib/quota.js), movidos de KV a D1.
-- Antes, CADA consulta a D1 y CADA lectura de sesión hacía un KV.put() para
-- sumar su contador, y KV solo permite 1.000 escrituras al día en el plan
-- gratuito: con unos pocos cientos de visitas diarias se agotaba KV y dejaba
-- de funcionar el inicio de sesión (crear una sesión es una escritura en KV).
-- Ahora los incrementos se acumulan en memoria y se vuelcan aquí por lotes
-- con un UPSERT atómico, a costa de unas pocas escrituras de D1 (100.000/día).
CREATE TABLE IF NOT EXISTS usage_counters (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_usage_counters_expires ON usage_counters(expires_at);
