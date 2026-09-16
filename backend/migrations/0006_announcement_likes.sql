-- Lets logged-in users like an announcement. One like per user per post
-- (toggle on/off), counted live via COUNT() rather than a denormalized
-- column so there's nothing to keep in sync.
CREATE TABLE announcement_likes (
  announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (announcement_id, user_id)
);

CREATE INDEX idx_announcement_likes_user ON announcement_likes(user_id);
