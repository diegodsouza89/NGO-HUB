/**
 * Cloudflare Pages Function - /api/tickets
 *
 * WHAT THIS REPLACES
 * ------------------
 * The contact form used to call createTicket() in lib/storage.ts, which wrote
 * the ticket into the visitor's own browser and then showed them a reference
 * number like NGO-482913. Nothing was ever sent anywhere. The admin inbox read
 * that same browser-local list, so it was permanently empty while people
 * believed they had contacted the organisation. Every request was lost.
 *
 * Tickets now live in a Cloudflare D1 database, so the inbox is the same list
 * for every admin on every machine.
 *
 * METHODS
 *   POST   /api/tickets            public - submit a ticket
 *   GET    /api/tickets            admin  - list tickets
 *   PATCH  /api/tickets            admin  - change a ticket's status
 *
 * WHY READS NEED A KEY
 * --------------------
 * Tickets hold a visitor's name, email address and phone number. /staff is a
 * screen in a JavaScript bundle that everyone downloads, so a password checked
 * in the browser protects nothing - anyone could call GET /api/tickets and read
 * the lot.
 *
 * So GET and PATCH require the header x-admin-key to match TICKETS_ADMIN_KEY,
 * which lives in the Pages project's environment variables and is never sent to
 * the browser. The admin types it into the Tickets tab once. That is a real
 * server-side check. POST stays open, because the whole point is that any
 * visitor can write in.
 *
 * ENV
 *   DB                 D1 binding (Settings -> Bindings -> D1 database)
 *   TICKETS_ADMIN_KEY  secret required to read or update tickets
 *
 * Same-origin and body-size limits come from functions/_middleware.js.
 */

const MAX = {
  name: 120,
  email: 200,
  phone: 40,
  subject: 200,
  categoryId: 80,
  message: 5000,
};

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

// A single source may file this many tickets an hour. Enough for a person who
// has more than one problem; not enough to fill the table.
const MAX_PER_HOUR = 5;
const PAGE_SIZE = 200;

/* ------------------------------------------------------------------ helpers */

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

/** Multi-line fields keep their line breaks; only runs of blanks collapse. */
function trimBody(v, max) {
  return str(v).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
}

function looksLikeEmail(value) {
  // Deliberately loose. The goal is to catch a typo, not to police addresses.
  return /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(value);
}

/**
 * Length-independent compare, so response timing cannot be used to work out
 * the admin key one character at a time.
 */
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

/** Six digits, from the crypto RNG rather than Math.random. */
function reference() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 900000;
  return 'NGO-' + (100000 + n);
}

function rowToTicket(row) {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    subject: row.subject,
    categoryId: row.category_id || '',
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}

function requireDb(env) {
  const db = env && env.DB;
  if (!db || typeof db.prepare !== 'function') {
    return json(
      {
        error:
          'The support desk is not connected yet. Please email or call the numbers on this page instead.',
        detail: 'No D1 binding named DB on this Pages project. See D1-SETUP.md.',
      },
      503
    );
  }
  return null;
}

function requireAdmin(request, env) {
  const expected = str(env && env.TICKETS_ADMIN_KEY).trim();
  if (!expected) {
    return json(
      {
        error:
          'Ticket reading is not configured. Set TICKETS_ADMIN_KEY in Cloudflare, then enter it here.',
      },
      503
    );
  }
  if (!safeEqual(request.headers.get('x-admin-key'), expected)) {
    return json({ error: 'That admin key is not correct.' }, 401);
  }
  return null;
}

/* -------------------------------------------------------------------- POST */

async function createTicket(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return json({ error: 'Could not read the form. Please try again.' }, 400);
  }

  const name = trim(payload && payload.name, MAX.name);
  const email = trim(payload && payload.email, MAX.email);
  const phone = trim(payload && payload.phone, MAX.phone);
  const subject = trim(payload && payload.subject, MAX.subject);
  const categoryId = trim(payload && payload.categoryId, MAX.categoryId);
  const message = trimBody(payload && payload.message, MAX.message);

  const missing = [];
  if (!name) missing.push('your name');
  if (!email) missing.push('your email address');
  if (!subject) missing.push('a subject');
  if (!message) missing.push('a message');
  if (missing.length) {
    return json({ error: 'Please fill in ' + missing.join(', ') + '.' }, 400);
  }
  if (!looksLikeEmail(email)) {
    return json({ error: 'That email address does not look right. Please check it.' }, 400);
  }

  const ipHash = await sha256Hex(
    request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown'
  );

  // Throttle by source, using the table we already have rather than another
  // binding. Counted over a rolling hour.
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  try {
    const recent = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM tickets WHERE ip_hash = ? AND created_at > ?'
    )
      .bind(ipHash, since)
      .first();
    if (recent && Number(recent.n) >= MAX_PER_HOUR) {
      return json(
        {
          error:
            'You have sent several requests in the last hour. Please wait a little before sending another.',
        },
        429
      );
    }
  } catch (e) {
    // If the count fails the table may not exist yet. Let the insert below
    // produce the real error rather than silently accepting the ticket.
  }

  const id = 'ticket-' + Date.now() + '-' + crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  const ticketId = reference();
  const createdAt = new Date().toISOString();

  try {
    await env.DB.prepare(
      'INSERT INTO tickets (id, ticket_id, name, email, phone, subject, category_id, message, status, created_at, ip_hash) ' +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)"
    )
      .bind(id, ticketId, name, email, phone, subject, categoryId, message, createdAt, ipHash)
      .run();
  } catch (e) {
    const detail = e && e.message ? String(e.message) : String(e);
    return json(
      {
        error:
          'We could not save your request. Nothing was sent — please email or call instead so it is not lost.',
        detail: detail.slice(0, 300),
      },
      502
    );
  }

  // Only now is the reference number real.
  return json(
    { ticket: { id, ticketId, name, email, phone, subject, categoryId, message, status: 'open', createdAt } },
    201
  );
}

/* --------------------------------------------------------------------- GET */

async function listTickets(request, env) {
  const url = new URL(request.url);
  const status = trim(url.searchParams.get('status'), 20);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '', 10) || PAGE_SIZE, 1), PAGE_SIZE);

  try {
    const query =
      status && STATUSES.indexOf(status) !== -1
        ? env.DB.prepare(
            'SELECT id, ticket_id, name, email, phone, subject, category_id, message, status, created_at ' +
              'FROM tickets WHERE status = ? ORDER BY created_at DESC LIMIT ?'
          ).bind(status, limit)
        : env.DB.prepare(
            'SELECT id, ticket_id, name, email, phone, subject, category_id, message, status, created_at ' +
              'FROM tickets ORDER BY created_at DESC LIMIT ?'
          ).bind(limit);

    const { results } = await query.all();
    const tickets = (results || []).map(rowToTicket);

    const counts = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    try {
      const summary = await env.DB.prepare('SELECT status, COUNT(*) AS n FROM tickets GROUP BY status').all();
      for (const row of summary.results || []) {
        if (Object.prototype.hasOwnProperty.call(counts, row.status)) counts[row.status] = Number(row.n);
      }
    } catch (e) {
      /* counts are a nicety; the list matters */
    }

    return json({ tickets, counts });
  } catch (e) {
    const detail = e && e.message ? String(e.message) : String(e);
    return json(
      {
        error: 'Could not read the tickets table. Has the schema been created?',
        detail: detail.slice(0, 300),
      },
      502
    );
  }
}

/* ------------------------------------------------------------------- PATCH */

async function updateTicket(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return json({ error: 'Could not read the request.' }, 400);
  }

  const id = trim(payload && payload.id, 200);
  const status = trim(payload && payload.status, 20);
  if (!id) return json({ error: 'Which ticket? No id was sent.' }, 400);
  if (STATUSES.indexOf(status) === -1) {
    return json({ error: 'Status must be one of: ' + STATUSES.join(', ') + '.' }, 400);
  }

  try {
    const result = await env.DB.prepare('UPDATE tickets SET status = ? WHERE id = ?').bind(status, id).run();
    const changed = result && result.meta ? result.meta.changes : undefined;
    if (changed === 0) return json({ error: 'No ticket with that id.' }, 404);
    return json({ id, status });
  } catch (e) {
    const detail = e && e.message ? String(e.message) : String(e);
    return json({ error: 'Could not update that ticket.', detail: detail.slice(0, 300) }, 502);
  }
}

/* ------------------------------------------------------------------- route */

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

  const noDb = requireDb(env);
  if (noDb) return noDb;

  if (request.method === 'POST') return createTicket(request, env);

  if (request.method === 'GET' || request.method === 'PATCH') {
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    return request.method === 'GET' ? listTickets(request, env) : updateTicket(request, env);
  }

  return json({ error: 'Method not allowed.' }, 405);
}
