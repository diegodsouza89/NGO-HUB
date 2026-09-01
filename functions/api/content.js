/**
 * Published site content, stored in D1.
 *
 * Why this exists
 * ---------------
 * Everything an admin does in /staff writes to that browser's localStorage.
 * To reach visitors it had to be exported as content.json and uploaded to
 * GitHub by hand. That round trip went wrong three times in one afternoon —
 * the file landed at the repository root, then as "content 3 lang.json", then
 * as "content (1).json" — and a set of translations typed in an incognito
 * window was lost outright because nothing had been exported before the window
 * closed.
 *
 * With this endpoint the Publish button writes straight to D1 and every
 * visitor picks the change up on their next load.
 *
 *   GET  /api/content   public, returns the published content
 *   PUT  /api/content   requires x-admin-key, replaces it
 *
 * content.json stays in the repository as the fallback. If D1 is empty, or
 * unreachable, or this endpoint is not deployed, the site serves the bundled
 * file exactly as it does today. Publishing is an upgrade, never a dependency.
 *
 * Bindings and secrets this needs:
 *   DB               D1 binding (already present for support tickets)
 *   CONTENT_ADMIN_KEY  secret, checked on PUT
 *
 * Run CONTENT-SCHEMA.sql against the database once before using it.
 */

const MAX_BODY_BYTES = 8 * 1024 * 1024;   // a fully translated set is ~1.5 MB
const KINDS = ['category', 'article'];
const HISTORY_LIMIT = 5;

function json(bodyObj, status, extraHeaders) {
  return new Response(JSON.stringify(bodyObj), {
    status: status || 200,
    headers: Object.assign(
      { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      extraHeaders || {}
    ),
  });
}

/**
 * Compares two strings in time that does not depend on where they differ.
 * A plain === on a secret leaks its prefix to anyone who can measure the
 * response, which is worth avoiding even on a small site.
 */
function safeEqual(a, b) {
  const x = String(a == null ? '' : a);
  const y = String(b == null ? '' : b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

function authorised(request, env) {
  const expected = env && env.CONTENT_ADMIN_KEY;
  if (!expected) return { ok: false, why: 'CONTENT_ADMIN_KEY is not set on this project.' };
  const given = request.headers.get('x-admin-key');
  if (!given) return { ok: false, why: 'Missing x-admin-key header.' };
  if (!safeEqual(given, expected)) return { ok: false, why: 'That admin key is not correct.' };
  return { ok: true };
}

/** An item must have a string id, and be small enough to be sane. */
function validItem(item) {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    item.id.length <= 200
  );
}

async function readPublished(db) {
  const rows = await db
    .prepare('SELECT kind, id, json FROM content_items ORDER BY kind, sort_order, id')
    .all();
  const out = { categories: [], articles: [] };
  for (const row of (rows && rows.results) || []) {
    let parsed;
    try {
      parsed = JSON.parse(row.json);
    } catch (e) {
      continue;   // a single corrupt row must not take the whole site down
    }
    if (row.kind === 'category') out.categories.push(parsed);
    else if (row.kind === 'article') out.articles.push(parsed);
  }
  return out;
}

export async function onRequest(context) {
  const { request, env } = context;
  const db = env && env.DB;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
      },
    });
  }

  if (!db) {
    // No database bound. Say so plainly and let the site fall back to the
    // bundled content.json rather than failing.
    return json({ error: 'No D1 database is bound to this project.', published: false }, 503);
  }

  /* ------------------------------------------------------------------ read */

  if (request.method === 'GET') {
    let content;
    try {
      content = await readPublished(db);
    } catch (err) {
      return json(
        { error: 'Could not read published content: ' + ((err && err.message) || 'unknown'), published: false },
        503
      );
    }

    if (!content.articles.length && !content.categories.length) {
      // Nothing published yet. This is a normal state, not an error: the site
      // uses the content.json shipped in the build.
      return json({ published: false, categories: [], articles: [] }, 200);
    }

    let meta = null;
    try {
      const row = await db
        .prepare('SELECT published_at, item_count, note FROM content_publishes ORDER BY id DESC LIMIT 1')
        .first();
      if (row) meta = { publishedAt: row.published_at, itemCount: row.item_count, note: row.note };
    } catch (e) {
      /* the audit row is a nicety, not a requirement */
    }

    return json(
      {
        published: true,
        publishedAt: meta && meta.publishedAt,
        note: meta && meta.note,
        categories: content.categories,
        articles: content.articles,
      },
      200,
      // Visitors may hold this briefly; a publish is picked up within a minute.
      { 'Cache-Control': 'public, max-age=60' }
    );
  }

  /* --------------------------------------------------------------- publish */

  if (request.method !== 'PUT') {
    return json({ error: 'Use GET to read published content, or PUT to publish.' }, 405);
  }

  const auth = authorised(request, env);
  if (!auth.ok) return json({ error: auth.why }, 401);

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json({ error: 'That is larger than this endpoint accepts (' + Math.round(raw.length / 1024) + ' KB).' }, 413);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    return json({ error: 'The request body is not valid JSON.' }, 400);
  }

  const categories = Array.isArray(payload && payload.categories) ? payload.categories : null;
  const articles = Array.isArray(payload && payload.articles) ? payload.articles : null;
  if (!categories || !articles) {
    return json({ error: 'Expected { categories: [...], articles: [...] }.' }, 400);
  }
  if (!categories.length && !articles.length) {
    // Refuse to publish nothing. An empty payload would blank the site for
    // everyone, and the likeliest cause is a bug at the sending end.
    return json({ error: 'Refusing to publish an empty set of content.' }, 400);
  }
  for (const item of categories.concat(articles)) {
    if (!validItem(item)) return json({ error: 'Every category and article needs a string id.' }, 400);
  }

  const now = new Date().toISOString();
  const note = typeof (payload && payload.note) === 'string' ? payload.note.slice(0, 200) : null;

  try {
    // Keep the outgoing state so one publish can be undone.
    const publish = await db
      .prepare('INSERT INTO content_publishes (published_at, item_count, note) VALUES (?, ?, ?) RETURNING id')
      .bind(now, categories.length + articles.length, note)
      .first();
    const publishId = publish && publish.id;

    if (publishId) {
      await db
        .prepare(
          'INSERT INTO content_history (publish_id, kind, id, json) ' +
            'SELECT ?, kind, id, json FROM content_items'
        )
        .bind(publishId)
        .run();
    }

    // Replace the current set. Batch so a failure part way through cannot
    // leave the site with half of one publish and half of another.
    const statements = [db.prepare('DELETE FROM content_items')];
    let order = 0;
    for (const category of categories) {
      statements.push(
        db
          .prepare('INSERT INTO content_items (kind, id, json, sort_order, updated_at) VALUES (?, ?, ?, ?, ?)')
          .bind('category', category.id, JSON.stringify(category), order++, now)
      );
    }
    order = 0;
    for (const article of articles) {
      statements.push(
        db
          .prepare('INSERT INTO content_items (kind, id, json, sort_order, updated_at) VALUES (?, ?, ?, ?, ?)')
          .bind('article', article.id, JSON.stringify(article), order++, now)
      );
    }
    await db.batch(statements);

    // Trim old history so the database does not grow without limit.
    if (publishId) {
      await db
        .prepare(
          'DELETE FROM content_history WHERE publish_id <= ' +
            '(SELECT MIN(id) FROM (SELECT id FROM content_publishes ORDER BY id DESC LIMIT ?))'
        )
        .bind(HISTORY_LIMIT)
        .run();
    }

    return json({
      published: true,
      publishedAt: now,
      categories: categories.length,
      articles: articles.length,
      publishId: publishId || null,
    });
  } catch (err) {
    return json(
      { error: 'Publish failed: ' + ((err && err.message) || 'unknown error') },
      500
    );
  }
}
