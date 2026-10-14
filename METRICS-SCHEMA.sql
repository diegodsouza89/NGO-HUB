-- Article view / download events for the NGO Knowledge Hub.
-- /api/metrics creates this table automatically on first use; this file is
-- for reference, or to create it by hand in the D1 Console.

CREATE TABLE IF NOT EXISTS article_events (
  id           TEXT PRIMARY KEY,
  kind         TEXT NOT NULL,          -- 'view' | 'download'
  article_id   TEXT NOT NULL,
  language     TEXT,
  user_id      TEXT,                   -- signed-in member, if any
  visitor_hash TEXT NOT NULL,          -- SHA-256(IP + user-agent + date); no IP stored
  date         TEXT NOT NULL,          -- YYYY-MM-DD, India time
  timestamp    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_date    ON article_events (date, kind);
CREATE INDEX IF NOT EXISTS idx_events_article ON article_events (article_id, kind);
CREATE INDEX IF NOT EXISTS idx_events_visitor ON article_events (visitor_hash, timestamp);
