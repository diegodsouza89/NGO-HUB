-- Published site content for the NGO Knowledge Hub.
--
-- Run this once against the same D1 database that already holds the support
-- tickets. Cloudflare dashboard -> Storage & Databases -> D1 -> your database
-- -> Console, paste the whole file, Execute.
--
-- Re-running it is safe: every statement is IF NOT EXISTS.

-- One row per article and per category, holding that item exactly as the
-- portal stores it. Per-item rows rather than one large blob, so a fully
-- translated set (about 1.5 MB across 22 articles in 8 languages) never
-- becomes a single oversized row.
CREATE TABLE IF NOT EXISTS content_items (
  kind        TEXT    NOT NULL,          -- 'category' or 'article'
  id          TEXT    NOT NULL,
  json        TEXT    NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT    NOT NULL,
  PRIMARY KEY (kind, id)
);

CREATE INDEX IF NOT EXISTS idx_content_items_kind ON content_items (kind, sort_order);

-- An audit line per publish, so you can see when the site last changed and
-- how much went out.
CREATE TABLE IF NOT EXISTS content_publishes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  published_at TEXT    NOT NULL,
  item_count   INTEGER NOT NULL,
  note         TEXT
);

-- The state that was live immediately BEFORE each publish, so a publish can be
-- undone. Only the last few are kept; the endpoint trims the rest.
CREATE TABLE IF NOT EXISTS content_history (
  publish_id INTEGER NOT NULL,
  kind       TEXT    NOT NULL,
  id         TEXT    NOT NULL,
  json       TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_content_history_publish ON content_history (publish_id);

-- Check it worked:
--   SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'content_%';
-- Should list content_history, content_items and content_publishes.
