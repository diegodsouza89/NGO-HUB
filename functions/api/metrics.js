/**
 * Cloudflare Pages Function - /api/metrics
 *
 * WHY THIS EXISTS
 * ---------------
 * Article views and downloads used to be written only to the visitor's own
 * browser (localStorage "ngo_page_views" / "ngo_download_logs"). The admin
 * dashboard read that same browser-local list, so its "Live Metrics" only ever
 * showed activity from the admin's own browser - and showed something
 * different on every other browser or device.
 *
 * Every view and download is now recorded once, centrally, in the same D1
 * database as tickets and members, so every admin sees the same numbers.
 *
 * METHODS
 *   POST /api/metrics   public - { kind: 'view' | 'download', articleId, language?, userId? }
 *   GET  /api/metrics   admin  - aggregated totals, per-article counts, daily trend
 *
 * PRIVACY
 *   No IP address is stored. A visitor is identified only by
 *   SHA-256(IP + user-agent + date), which changes every day. That is enough to
 *   count unique visitors per day and to ignore repeat refreshes, and nothing
 *   more.
 *
 * ENV
 *   DB                 D1 binding (same as tickets / users)
 *   TICKETS_ADMIN_KEY  required header x-admin-key for GET
 *
 * Same-origin and body-size limits for POST come from functions/_middleware.js.
 */

const KINDS = ['view', 'download'];
const LANGS = ['en', 'hi', 'mr', 'ta', 'te', 'bn', 'gu', 'kn'];

// The same visitor reopening the same article within this window counts once.
// It also absorbs React dev-mode double effects and quick refreshes.
const DEDUPE_MINUTES = 30;
// Upper bound on events one visitor can record per hour - stops a script from
// inflating the numbers or filling the table.
const MAX_EVENTS_PER_HOUR = 300;
const TREND_DAYS_MAX = 90;
// Dates are bucketed in India time so "12 Oct" means 12 Oct for the team.
const TZ_OFFSET_MS = 5.5 * 60 * 60 * 1000;

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

function istDate(ms) {
  return new Date(ms + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(
      'CREATE TABLE IF NOT EXISTS article_events (' +
        'id TEXT PRIMARY KEY, kind TEXT NOT NULL, article_id TEXT NOT NULL, language TEXT, ' +
        'user_id TEXT, visitor_hash TEXT NOT NULL, date TEXT NOT NULL, timestamp INTEGER NOT NULL)'
    ),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_events_date ON article_events (date, kind)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_events_article ON article_events (article_id, kind)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_events_visitor ON article_events (visitor_hash, timestamp)'),
  ]);
  schemaReady = true;
}

function requireDb(env) {
  const db = env && env.DB;
  if (!db || typeof db.prepare !== 'function') {
    return json({ error: 'Metrics are not connected yet.', detail: 'No D1 binding named DB.' }, 503);
  }
  return null;
}

function requireAdmin(request, env) {
  const expected = str(env && env.TICKETS_ADMIN_KEY).trim();
  if (!expected) return json({ error: 'Set TICKETS_ADMIN_KEY in Cloudflare to view metrics.' }, 503);
  if (!safeEqual(request.headers.get('x-admin-key'), expected)) {
    return json({ error: 'That admin key is not correct.' }, 401);
  }
  return null;
}

/* -------------------------------------------------------------------- POST */

async function recordEvent(request, env) {
  let p;
  try {
    p = await request.json();
  } catch (e) {
    return json({ error: 'Could not read the request.' }, 400);
  }

  const kind = trim(p && p.kind, 20);
  const articleId = trim(p && p.articleId, 80);
  const language = LANGS.indexOf(trim(p && p.language, 5)) !== -1 ? trim(p.language, 5) : 'en';
  const userId = trim(p && p.userId, 80) || null;

  if (KINDS.indexOf(kind) === -1) return json({ error: 'Unknown event kind.' }, 400);
  if (!articleId || !/^[A-Za-z0-9_.:-]+$/.test(articleId)) return json({ error: 'Invalid article id.' }, 400);

  const now = Date.now();
  const date = istDate(now);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ua = request.headers.get('User-Agent') || '';
  const visitorHash = await sha256Hex(ip + '|' + ua + '|' + date);
  const db = env.DB;

  const hourAgo = now - 60 * 60 * 1000;
  const recent = await db
    .prepare('SELECT COUNT(*) AS n FROM article_events WHERE visitor_hash = ? AND timestamp > ?')
    .bind(visitorHash, hourAgo)
    .first();
  if (recent && Number(recent.n) >= MAX_EVENTS_PER_HOUR) {
    return json({ ok: true, counted: false, reason: 'rate_limited' }, 202);
  }

  if (kind === 'view') {
    const dup = await db
      .prepare(
        "SELECT 1 FROM article_events WHERE visitor_hash = ? AND article_id = ? AND kind = 'view' AND timestamp > ? LIMIT 1"
      )
      .bind(visitorHash, articleId, now - DEDUPE_MINUTES * 60 * 1000)
      .first();
    if (dup) return json({ ok: true, counted: false, reason: 'duplicate' });
  }

  const id = 'ev-' + now.toString(36) + '-' + crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  await db
    .prepare(
      'INSERT INTO article_events (id, kind, article_id, language, user_id, visitor_hash, date, timestamp) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(id, kind, articleId, language, userId, visitorHash, date, now)
    .run();

  return json({ ok: true, counted: true }, 201);
}

/* --------------------------------------------------------------------- GET */

async function readMetrics(request, env) {
  const url = new URL(request.url);
  const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '', 10) || 14, 1), TREND_DAYS_MAX);
  const db = env.DB;

  const now = Date.now();
  const from = istDate(now - (days - 1) * 24 * 60 * 60 * 1000);

  const [totals, perArticle, daily, uniqueAll] = await db.batch([
    db.prepare(
      "SELECT SUM(kind = 'view') AS views, SUM(kind = 'download') AS downloads FROM article_events"
    ),
    db.prepare(
      "SELECT article_id, SUM(kind = 'view') AS views, SUM(kind = 'download') AS downloads " +
        'FROM article_events GROUP BY article_id'
    ),
    db
      .prepare(
        "SELECT date, SUM(kind = 'view') AS views, SUM(kind = 'download') AS downloads, " +
          'COUNT(DISTINCT visitor_hash) AS visitors FROM article_events WHERE date >= ? GROUP BY date'
      )
      .bind(from),
    db
      .prepare('SELECT COUNT(DISTINCT visitor_hash) AS visitors FROM article_events WHERE date >= ?')
      .bind(from),
  ]);

  const t = (totals.results && totals.results[0]) || {};
  const articles = {};
  for (const row of perArticle.results || []) {
    articles[row.article_id] = { views: Number(row.views) || 0, downloads: Number(row.downloads) || 0 };
  }
  const byDate = {};
  for (const row of daily.results || []) {
    byDate[row.date] = {
      views: Number(row.views) || 0,
      downloads: Number(row.downloads) || 0,
      visitors: Number(row.visitors) || 0,
    };
  }

  return json({
    totals: { views: Number(t.views) || 0, downloads: Number(t.downloads) || 0 },
    visitorsInRange: Number(((uniqueAll.results || [])[0] || {}).visitors) || 0,
    days,
    from,
    articles,
    byDate,
    generatedAt: new Date(now).toISOString(),
  });
}

/* ------------------------------------------------------------------- route */

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

  const noDb = requireDb(env);
  if (noDb) return noDb;

  try {
    await ensureSchema(env.DB);
    if (request.method === 'POST') return await recordEvent(request, env);
    if (request.method === 'GET') {
      const denied = requireAdmin(request, env);
      if (denied) return denied;
      return await readMetrics(request, env);
    }
    return json({ error: 'Method not allowed.' }, 405);
  } catch (e) {
    const detail = e && e.message ? String(e.message) : String(e);
    return json({ error: 'The metrics database could not be reached.', detail: detail.slice(0, 300) }, 502);
  }
}
