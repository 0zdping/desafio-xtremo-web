-- Lightweight, privacy-friendly site analytics (page views + link clicks).
-- No cookies, no stored IPs: `visitor_hash` is a salted SHA-256 of
-- IP+UA+day, computed server-side in functions/api/track.js and never
-- reversible back to the visitor, so this needs no cookie-consent banner.
CREATE TABLE analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,                 -- 'pageview' | 'click'
  path TEXT NOT NULL DEFAULT '',
  target TEXT,                        -- click only: resolved link label (see track.js)
  visitor_hash TEXT NOT NULL,
  referrer TEXT NOT NULL DEFAULT 'direct',
  device TEXT NOT NULL DEFAULT 'desktop',
  country TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_analytics_created ON analytics_events(created_at);
CREATE INDEX idx_analytics_type ON analytics_events(type, created_at);
CREATE INDEX idx_analytics_path ON analytics_events(path);

INSERT INTO permissions (key, label, description) VALUES
  ('panel.view_stats', 'Ver estadísticas', 'Puede ver el panel de estadísticas de visitas y clics del sitio');

-- Same OR IGNORE + CROSS JOIN pattern as 0002/0004: Owner/Co-Owner get every
-- permission automatically, this just backfills the one added above.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name IN ('Owner', 'Co-Owner');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key = 'panel.view_stats'
WHERE r.name IN ('Community Manager', 'Admin');
