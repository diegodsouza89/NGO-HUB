-- Support tickets for the NGO Knowledge Hub.
--
-- Run this once against your D1 database (Cloudflare dashboard -> your database
-- -> Console). Safe to run again; every statement is IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS tickets (
  id          TEXT PRIMARY KEY,
  ticket_id   TEXT NOT NULL,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  subject     TEXT NOT NULL,
  category_id TEXT,
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  TEXT NOT NULL,
  -- SHA-256 of the sender's IP with a per-request salt-free hash. Stored so a
  -- flood from one source can be throttled without keeping anyone's address.
  ip_hash     TEXT
);

CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_status  ON tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_ip      ON tickets (ip_hash, created_at);
