-- Downloadable posters and document templates for the NGO Knowledge Hub.
--
-- Run this once against the same D1 database that already holds tickets and
-- content. Cloudflare dashboard -> Storage & Databases -> D1 -> your database
-- -> Console, paste the whole file, Execute.
--
-- Re-running it is safe: every statement is IF NOT EXISTS.

-- One row per poster / template. The file itself lives in resource_chunks.
CREATE TABLE IF NOT EXISTS resources (
  id             TEXT    PRIMARY KEY,
  title          TEXT    NOT NULL,
  description    TEXT    NOT NULL DEFAULT '',
  kind           TEXT    NOT NULL DEFAULT 'template',   -- 'poster' | 'template' | 'other'
  category_id    TEXT,                                  -- optional link to a site category
  file_name      TEXT    NOT NULL,
  mime           TEXT    NOT NULL,
  size           INTEGER NOT NULL,
  chunk_count    INTEGER NOT NULL,
  thumbnail      TEXT,                                  -- small JPEG data: URL, images only
  published      INTEGER NOT NULL DEFAULT 1,
  download_count INTEGER NOT NULL DEFAULT 0,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT    NOT NULL,
  updated_at     TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_resources_kind ON resources (published, kind, sort_order);

-- The file, split into pieces of about 512 KB stored as base64 text. D1 caps a
-- row at 2 MB, so a whole poster cannot go in one row. The browser splits and
-- re-joins the pieces, which keeps the server well inside its CPU limit.
CREATE TABLE IF NOT EXISTS resource_chunks (
  resource_id TEXT    NOT NULL,
  idx         INTEGER NOT NULL,
  data        TEXT    NOT NULL,
  created_at  TEXT    NOT NULL,
  PRIMARY KEY (resource_id, idx)
);

-- Check it worked:
--   SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'resource%';
-- Should list resource_chunks and resources.
