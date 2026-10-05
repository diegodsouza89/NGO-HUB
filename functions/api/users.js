/**
 * Cloudflare Pages Function - /api/users
 *
 * WHY THIS EXISTS
 * ---------------
 * Registered members used to live only in each visitor's own browser
 * (localStorage "ngo_users"). That had three problems:
 *   1. The admin's "NGO Users" screen only ever showed people who had signed
 *      in on the admin's own browser - plus two fake demo accounts (Priya
 *      Sharma, Dr. Rajesh Kulkarni) seeded into every browser.
 *   2. Anyone who signed in on a shared computer left their name, email and
 *      organisation in that browser for the next person.
 *   3. Nothing was ever collected centrally.
 *
 * Members and their login history now live in the same Cloudflare D1 database
 * as support tickets. Visitors' browsers keep only their OWN profile.
 *
 * METHODS
 *   POST   /api/users   public  - { action: 'register' | 'login' | 'activity', ... }
 *   GET    /api/users   admin   - list members + recent login history
 *   PATCH  /api/users   admin   - { id, status: 'active' | 'suspended' }
 *   DELETE /api/users   admin   - { id }  remove a member and their history
 *
 * Admin calls need header x-admin-key = TICKETS_ADMIN_KEY (the same key the
 * Support Tickets tab already uses). Tables are created automatically on first
 * use - USERS-SCHEMA.sql documents them.
 */

const MAX = { name: 120, email: 200, org: 200, role: 120, sector: 120, device: 80 };
const STATUSES = ['active', 'suspended'];
const MAX_REGISTRATIONS_PER_HOUR = 10;
const LOG_LIMIT = 2000;

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function str(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function trim(v, max) {
  return str(v).replace(/\s+/g, ' ').trim().slice(0, max);
}

function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(value);
}

function safeEqual(a, b) {
  const x = str(a);
  const y = str(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(str(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomId(prefix) {
  return prefix + Date.now().toString(36) + crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
}

function parseIds(value) {
  try {
    const arr = JSON.parse(value || '[]');
    return Array.isArray(arr) ? arr.map(str).slice(0, 500) : [];
  } catch (e) {
    return [];
  }
}

function rowToUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    organizationName: row.organization_name || '',
    role: row.role || '',
    sector: row.sector || '',
    registeredAt: row.registered_at,
    lastLoginAt: row.last_login_at,
    loginCount: Number(row.login_count) || 0,
    pageViewsCount: Number(row.page_views_count) || 0,
    downloadsCount: Number(row.downloads_count) || 0,
    savedResourceIds: parseIds(row.saved_resource_ids),
    status: row.status === 'suspended' ? 'suspended' : 'active',
  };
}

function rowToLog(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    organizationName: row.organization_name || '',
    role: row.role || '',
    timestamp: Number(row.timestamp),
    date: row.date,
    device: row.device || '',
  };
}

let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(
      'CREATE TABLE IF NOT EXISTS members (' +
        'id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, ' +
        'organization_name TEXT, role TEXT, sector TEXT, ' +
        'registered_at TEXT NOT NULL, last_login_at TEXT, login_count INTEGER NOT NULL DEFAULT 0, ' +
        'page_views_count INTEGER NOT NULL DEFAULT 0, downloads_count INTEGER NOT NULL DEFAULT 0, ' +
        "saved_resource_ids TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'active', ip_hash TEXT)"
    ),
    db.prepare(
      'CREATE TABLE IF NOT EXISTS member_logins (' +
        'id TEXT PRIMARY KEY, user_id TEXT NOT NULL, user_name TEXT, user_email TEXT, ' +
        'organization_name TEXT, role TEXT, timestamp INTEGER NOT NULL, date TEXT NOT NULL, device TEXT)'
    ),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_member_logins_ts ON member_logins (timestamp DESC)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_member_logins_user ON member_logins (user_id)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_members_ip ON members (ip_hash, registered_at)'),
  ]);
  schemaReady = true;
}

function requireDb(env) {
  const db = env && env.DB;
  if (!db || typeof db.prepare !== 'function') {
    return json({ error: 'Member accounts are not connected yet.', detail: 'No D1 binding named DB.' }, 503);
  }
  return null;
}

function requireAdmin(request, env) {
  const expected = str(env && env.TICKETS_ADMIN_KEY).trim();
  if (!expected) return json({ error: 'Set TICKETS_ADMIN_KEY in Cloudflare to view members.' }, 503);
  if (!safeEqual(request.headers.get('x-admin-key'), expected)) {
    return json({ error: 'That admin key is not correct.' }, 401);
  }
  return null;
}

async function recordLogin(db, user, device) {
  const now = Date.now();
  await db
    .prepare(
      'INSERT INTO member_logins (id, user_id, user_name, user_email, organization_name, role, timestamp, date, device) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(
      randomId('log-'),
      user.id,
      user.name,
      user.email,
      user.organizationName,
      user.role,
      now,
      new Date(now).toISOString().slice(0, 10),
      device
    )
    .run();
}

/* -------------------------------------------------------------------- POST */

async function handlePost(request, env) {
  let p;
  try {
    p = await request.json();
  } catch (e) {
    return json({ error: 'Could not read the form. Please try again.' }, 400);
  }
  const action = trim(p && p.action, 20);
  const email = trim(p && p.email, MAX.email).toLowerCase();
  const device = trim(p && p.device, MAX.device) || 'Browser';
  const db = env.DB;

  if (!email || !looksLikeEmail(email)) {
    return json({ error: 'Please enter a valid email address.' }, 400);
  }

  const existing = await db.prepare('SELECT * FROM members WHERE email = ?').bind(email).first();

  if (action === 'register') {
    const name = trim(p.name, MAX.name);
    const org = trim(p.organizationName, MAX.org);
    const role = trim(p.role, MAX.role) || 'NGO Professional';
    const sector = trim(p.sector, MAX.sector) || 'All Sectors';
    if (!name || !org) return json({ error: 'Please fill in your name and organisation.' }, 400);
    const nowIso = new Date().toISOString();

    if (existing) {
      if (existing.status === 'suspended') {
        return json({ error: 'This account has been suspended by the administrator.' }, 403);
      }
      await db
        .prepare(
          'UPDATE members SET name = ?, organization_name = ?, role = ?, sector = ?, last_login_at = ?, login_count = login_count + 1 WHERE id = ?'
        )
        .bind(name, org, role, sector, nowIso, existing.id)
        .run();
    } else {
      const ipHash = await sha256Hex(request.headers.get('CF-Connecting-IP') || 'unknown');
      const since = new Date(Date.now() - 3600 * 1000).toISOString();
      const recent = await db
        .prepare('SELECT COUNT(*) AS n FROM members WHERE ip_hash = ? AND registered_at > ?')
        .bind(ipHash, since)
        .first();
      if (recent && Number(recent.n) >= MAX_REGISTRATIONS_PER_HOUR) {
        return json({ error: 'Too many registrations from this network. Please try again later.' }, 429);
      }
      await db
        .prepare(
          'INSERT INTO members (id, name, email, organization_name, role, sector, registered_at, last_login_at, login_count, status, ip_hash) ' +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'active', ?)"
        )
        .bind(randomId('usr-'), name, email, org, role, sector, nowIso, nowIso, ipHash)
        .run();
    }
    const row = await db.prepare('SELECT * FROM members WHERE email = ?').bind(email).first();
    const user = rowToUser(row);
    await recordLogin(db, user, device);
    return json({ user }, existing ? 200 : 201);
  }

  if (action === 'login') {
    if (!existing) {
      return json({ error: 'No account found with this email. Please register your NGO details first.' }, 404);
    }
    if (existing.status === 'suspended') {
      return json({ error: 'This account has been suspended by the administrator.' }, 403);
    }
    await db
      .prepare('UPDATE members SET last_login_at = ?, login_count = login_count + 1 WHERE id = ?')
      .bind(new Date().toISOString(), existing.id)
      .run();
    const row = await db.prepare('SELECT * FROM members WHERE id = ?').bind(existing.id).first();
    const user = rowToUser(row);
    await recordLogin(db, user, device);
    return json({ user });
  }

  if (action === 'activity') {
    // Counters for the member's own page views / downloads / bookmarks.
    // Requires id + email to match so one member cannot touch another's row.
    const id = trim(p.id, 80);
    if (!existing || existing.id !== id) return json({ error: 'Unknown member.' }, 404);
    const kind = trim(p.kind, 20);
    if (kind === 'view') {
      await db.prepare('UPDATE members SET page_views_count = page_views_count + 1 WHERE id = ?').bind(id).run();
    } else if (kind === 'download') {
      await db.prepare('UPDATE members SET downloads_count = downloads_count + 1 WHERE id = ?').bind(id).run();
    } else if (kind === 'bookmarks') {
      const ids = Array.isArray(p.savedResourceIds) ? p.savedResourceIds.map((x) => trim(x, 80)).slice(0, 500) : [];
      await db.prepare('UPDATE members SET saved_resource_ids = ? WHERE id = ?').bind(JSON.stringify(ids), id).run();
    } else {
      return json({ error: 'Unknown activity.' }, 400);
    }
    return json({ ok: true });
  }

  return json({ error: 'Unknown action.' }, 400);
}

/* ------------------------------------------------------------------- admin */

async function listMembers(env) {
  const db = env.DB;
  const users = await db.prepare('SELECT * FROM members ORDER BY registered_at DESC').all();
  const logs = await db
    .prepare('SELECT * FROM member_logins ORDER BY timestamp DESC LIMIT ?')
    .bind(LOG_LIMIT)
    .all();
  return json({
    users: (users.results || []).map(rowToUser),
    loginLogs: (logs.results || []).map(rowToLog),
  });
}

async function updateMember(request, env) {
  let p;
  try {
    p = await request.json();
  } catch (e) {
    return json({ error: 'Could not read the request.' }, 400);
  }
  const id = trim(p && p.id, 80);
  const status = trim(p && p.status, 20);
  if (!id || STATUSES.indexOf(status) === -1) return json({ error: 'Send an id and a valid status.' }, 400);
  const r = await env.DB.prepare('UPDATE members SET status = ? WHERE id = ?').bind(status, id).run();
  if (r && r.meta && r.meta.changes === 0) return json({ error: 'No member with that id.' }, 404);
  return json({ id, status });
}

async function deleteMember(request, env) {
  let p;
  try {
    p = await request.json();
  } catch (e) {
    return json({ error: 'Could not read the request.' }, 400);
  }
  const id = trim(p && p.id, 80);
  if (!id) return json({ error: 'Which member? No id was sent.' }, 400);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM member_logins WHERE user_id = ?').bind(id),
    env.DB.prepare('DELETE FROM members WHERE id = ?').bind(id),
  ]);
  return json({ id, deleted: true });
}

/* ------------------------------------------------------------------- route */

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

  const noDb = requireDb(env);
  if (noDb) return noDb;

  try {
    await ensureSchema(env.DB);

    if (request.method === 'POST') return await handlePost(request, env);

    if (['GET', 'PATCH', 'DELETE'].indexOf(request.method) !== -1) {
      const denied = requireAdmin(request, env);
      if (denied) return denied;
      if (request.method === 'GET') return await listMembers(env);
      if (request.method === 'PATCH') return await updateMember(request, env);
      return await deleteMember(request, env);
    }
    return json({ error: 'Method not allowed.' }, 405);
  } catch (e) {
    const detail = e && e.message ? String(e.message) : String(e);
    return json({ error: 'The member database could not be reached. Please try again.', detail: detail.slice(0, 300) }, 502);
  }
}
