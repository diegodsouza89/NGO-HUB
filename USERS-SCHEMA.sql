-- Member accounts for the NGO Knowledge Hub.
-- /api/users creates these tables automatically on first use; this file is
-- for reference, or to create them by hand in the D1 Console.

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  organization_name TEXT, role TEXT, sector TEXT,
  registered_at TEXT NOT NULL, last_login_at TEXT, login_count INTEGER NOT NULL DEFAULT 0,
  page_views_count INTEGER NOT NULL DEFAULT 0, downloads_count INTEGER NOT NULL DEFAULT 0,
  saved_resource_ids TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'active', ip_hash TEXT
);
CREATE TABLE IF NOT EXISTS member_logins (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, user_name TEXT, user_email TEXT,
  organization_name TEXT, role TEXT, timestamp INTEGER NOT NULL, date TEXT NOT NULL, device TEXT
);
CREATE INDEX IF NOT EXISTS idx_member_logins_ts ON member_logins (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_member_logins_user ON member_logins (user_id);
CREATE INDEX IF NOT EXISTS idx_members_ip ON members (ip_hash, registered_at);
