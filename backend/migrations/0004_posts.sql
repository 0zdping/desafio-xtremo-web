-- Upgrades "announcements" into full blog/vlog posts (RoveMC-news-style):
-- rich HTML body (from the Quill editor, sanitized at save time: no DOM in
-- the Workers runtime to sanitize at serve time), a cover image, a category
-- pill, a short list/teaser excerpt independent of the body, a URL slug for
-- individual /anuncios/<slug> pages, and a simple non-deduplicated view
-- counter.
ALTER TABLE announcements ADD COLUMN slug TEXT;
ALTER TABLE announcements ADD COLUMN excerpt TEXT NOT NULL DEFAULT '';
ALTER TABLE announcements ADD COLUMN hero_image_url TEXT;
ALTER TABLE announcements ADD COLUMN category TEXT NOT NULL DEFAULT 'Anuncio';
ALTER TABLE announcements ADD COLUMN views INTEGER NOT NULL DEFAULT 0;
-- SQLite allows multiple NULLs through a UNIQUE index, so this doesn't
-- conflict with any pre-existing rows that predate the slug column.
CREATE UNIQUE INDEX idx_announcements_slug ON announcements(slug);
