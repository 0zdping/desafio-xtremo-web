-- Store the resolved Mojang UUID alongside each team member's nick, so the
-- public skin render can use a stable, fast, non-ratelimited lookup instead
-- of a live username lookup on every page view.
ALTER TABLE team_members ADD COLUMN mc_uuid TEXT;
