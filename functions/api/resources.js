/**
 * Cloudflare Pages Function - /api/resources
 *
 * Posters and document templates that admins upload in /staff and visitors
 * download from the public "Posters & Templates" page.
 *
 * Files are stored in D1 (no R2 needed) as base64 pieces of ~512 KB each,
 * because a D1 row is capped at 2 MB. The browser does the splitting on upload
 * and the re-joining on download, so this function only moves small strings
 * around and stays far inside the Workers CPU limit.
 *
 * PUBLIC
 *   GET    /api/resources                    published items (no file data)
 *   GET    /api/resources?id=X&chunk=N       one base64 piece of a published file
 *   POST   /api/resources {action:'download', id}   counts a download
 *
 * ADMIN (header x-admin-key = CONTENT_ADMIN_KEY)
 *   GET    /api/resources                    every item, drafts included
 *   PUT    {action:'chunk', uploadId, index, data}
 *   PUT    {action:'finalize', uploadId, title, description, kind, categoryId,
 *           fileName, mime, size, chunkCount, thumbnail, published}
 *   PUT    {action:'update', id, title?, description?, kind?, categoryId?, published?}
 *   DELETE /api/resources?id=X
 *
 * Uploads use PUT on purpose: functions/_middleware.js caps POST bodies at
 * 128 KB, and one piece is larger than that.
 */

const KINDS = ['poster', 'template', 'other'];
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_CHUNK_CHARS = 1024 * 1024;          // base64 of a 512 KB piece is ~700 KB
const MAX_CHUNKS = 80;
const MAX_THUMB_CHARS = 120 * 1024;
const ORPHAN_HOURS = 24;

// Types an admin may upload. SVG and HTML are deliberately absent: served from
// this origin they could run script.
const ALLOWED_MIME = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.oasis.opendocument.text': 'odt',
  'application/zip': 'zip',
  'text/plain': 'txt',
  'text/csv': 'csv',
};

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function str(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function clean(v, max) {
  return str(v).replace(/\s+/g, ' ').trim().slice(0, max);
}

function safeEqual(a, b) {
  const x = String(a == null ? '' : a);
  const y = String(b == null ? '' : b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

function isAdmin(request, env) {
  const expected = env && env.CONTENT_ADMIN_KEY;
  const given = request.headers.get('x-admin-key');
  return !!expected && !!given && safeEqual(given, expected);
}

const ID_RE = /^[a-z0-9-]{8,64}$/;

function rowToItem(r) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    kind: r.kind,
    categoryId: r.category_id || undefined,
    fileName: r.file_name,
    mime: r.mime,
    size: r.size,
    chunkCount: r.chunk_count,
    thumbnail: r.thumbnail || undefined,
    published: !!r.published,
    downloadCount: r.download_count,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function readBody(request) {
  try {
    return await request.json();
  } catch (e) {
    return null;
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  const db = env && env.DB;
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
      },
    });
  }

  if (!db) return json({ error: 'No D1 database is bound to this project.', available: false }, 503);

  const admin = isAdmin(request, env);

  try {
    /* -------------------------------------------------------------- GET */
    if (request.method === 'GET') {
      const id = url.searchParams.get('id');
      const chunk = url.searchParams.get('chunk');

      if (id !== null && chunk !== null) {
        if (!ID_RE.test(id)) return json({ error: 'Bad id.' }, 400);
        const idx = Number(chunk);
        if (!Number.isInteger(idx) || idx < 0 || idx >= MAX_CHUNKS) return json({ error: 'Bad chunk.' }, 400);
        const meta = await db.prepare('SELECT published, chunk_count FROM resources WHERE id = ?').bind(id).first();
        if (!meta || (!meta.published && !admin)) return json({ error: 'Not found.' }, 404);
        if (idx >= meta.chunk_count) return json({ error: 'Bad chunk.' }, 400);
        const row = await db
          .prepare('SELECT data FROM resource_chunks WHERE resource_id = ? AND idx = ?')
          .bind(id, idx)
          .first();
        if (!row) return json({ error: 'That piece of the file is missing.' }, 404);
        return new Response(JSON.stringify({ data: row.data }), {
          headers: {
            'Content-Type': 'application/json',
            // Pieces never change for a given id, so let the edge cache them.
            'Cache-Control': meta.published ? 'public, max-age=3600' : 'no-store',
          },
        });
      }

      const sql = admin
        ? 'SELECT * FROM resources ORDER BY created_at DESC'
        : 'SELECT * FROM resources WHERE published = 1 ORDER BY created_at DESC';
      const rows = await db.prepare(sql).all();
      return json({ available: true, admin, items: ((rows && rows.results) || []).map(rowToItem) });
    }

    /* ------------------------------------------------- POST (public count) */
    if (request.method === 'POST') {
      const body = await readBody(request);
      if (!body || body.action !== 'download' || !ID_RE.test(str(body.id))) {
        return json({ error: 'Bad request.' }, 400);
      }
      await db
        .prepare('UPDATE resources SET download_count = download_count + 1 WHERE id = ? AND published = 1')
        .bind(body.id)
        .run();
      return json({ ok: true });
    }

    /* ------------------------------------------------------ admin only */
    if (!admin) {
      return json(
        {
          error: env && env.CONTENT_ADMIN_KEY
            ? 'That admin key is not correct.'
            : 'CONTENT_ADMIN_KEY is not set on this Cloudflare project.',
        },
        401
      );
    }

    if (request.method === 'DELETE') {
      const id = str(url.searchParams.get('id'));
      if (!ID_RE.test(id)) return json({ error: 'Bad id.' }, 400);
      await db.batch([
        db.prepare('DELETE FROM resource_chunks WHERE resource_id = ?').bind(id),
        db.prepare('DELETE FROM resources WHERE id = ?').bind(id),
      ]);
      return json({ ok: true });
    }

    if (request.method === 'PUT') {
      const body = await readBody(request);
      if (!body) return json({ error: 'Body must be JSON.' }, 400);
      const now = new Date().toISOString();

      if (body.action === 'chunk') {
        const uploadId = str(body.uploadId);
        const index = Number(body.index);
        const data = str(body.data);
        if (!ID_RE.test(uploadId)) return json({ error: 'Bad uploadId.' }, 400);
        if (!Number.isInteger(index) || index < 0 || index >= MAX_CHUNKS) return json({ error: 'Bad index.' }, 400);
        if (!data || data.length > MAX_CHUNK_CHARS || !/^[A-Za-z0-9+/=]+$/.test(data)) {
          return json({ error: 'Bad chunk data.' }, 400);
        }
        // Refuse to overwrite pieces of a file that is already live.
        const existing = await db.prepare('SELECT id FROM resources WHERE id = ?').bind(uploadId).first();
        if (existing) return json({ error: 'That upload is already finished.' }, 409);
        await db
          .prepare('INSERT OR REPLACE INTO resource_chunks (resource_id, idx, data, created_at) VALUES (?, ?, ?, ?)')
          .bind(uploadId, index, data, now)
          .run();
        return json({ ok: true });
      }

      if (body.action === 'finalize') {
        const uploadId = str(body.uploadId);
        if (!ID_RE.test(uploadId)) return json({ error: 'Bad uploadId.' }, 400);
        const title = clean(body.title, 200);
        const description = clean(body.description, 1000);
        const kind = KINDS.includes(body.kind) ? body.kind : 'template';
        const categoryId = clean(body.categoryId, 200) || null;
        const fileName = clean(body.fileName, 200).replace(/[\\/"<>]/g, '_');
        const mime = str(body.mime);
        const size = Number(body.size);
        const chunkCount = Number(body.chunkCount);
        const thumbnail = str(body.thumbnail);
        const published = body.published === false ? 0 : 1;

        if (!title) return json({ error: 'A title is required.' }, 400);
        if (!fileName) return json({ error: 'A file name is required.' }, 400);
        if (!ALLOWED_MIME[mime]) return json({ error: 'That file type is not allowed.' }, 400);
        if (!Number.isInteger(size) || size <= 0 || size > MAX_FILE_BYTES) {
          return json({ error: 'Files must be 25 MB or smaller.' }, 400);
        }
        if (!Number.isInteger(chunkCount) || chunkCount < 1 || chunkCount > MAX_CHUNKS) {
          return json({ error: 'Bad chunkCount.' }, 400);
        }
        if (thumbnail && (thumbnail.length > MAX_THUMB_CHARS || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(thumbnail))) {
          return json({ error: 'Bad thumbnail.' }, 400);
        }

        const got = await db
          .prepare('SELECT COUNT(*) AS n, MAX(idx) AS hi FROM resource_chunks WHERE resource_id = ?')
          .bind(uploadId)
          .first();
        if (!got || got.n !== chunkCount || got.hi !== chunkCount - 1) {
          return json({ error: 'Some pieces of the file did not arrive. Please upload it again.' }, 409);
        }

        await db
          .prepare(
            `INSERT INTO resources
               (id, title, description, kind, category_id, file_name, mime, size, chunk_count,
                thumbnail, published, download_count, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`
          )
          .bind(uploadId, title, description, kind, categoryId, fileName, mime, size, chunkCount,
                thumbnail || null, published, now, now)
          .run();

        // Tidy pieces left behind by uploads that never finished.
        const cutoff = new Date(Date.now() - ORPHAN_HOURS * 3600 * 1000).toISOString();
        await db
          .prepare(
            'DELETE FROM resource_chunks WHERE created_at < ? AND resource_id NOT IN (SELECT id FROM resources)'
          )
          .bind(cutoff)
          .run();

        const row = await db.prepare('SELECT * FROM resources WHERE id = ?').bind(uploadId).first();
        return json({ ok: true, item: rowToItem(row) });
      }

      if (body.action === 'update') {
        const id = str(body.id);
        if (!ID_RE.test(id)) return json({ error: 'Bad id.' }, 400);
        const sets = [];
        const vals = [];
        if (body.title !== undefined) {
          const t = clean(body.title, 200);
          if (!t) return json({ error: 'A title is required.' }, 400);
          sets.push('title = ?'); vals.push(t);
        }
        if (body.description !== undefined) { sets.push('description = ?'); vals.push(clean(body.description, 1000)); }
        if (body.kind !== undefined) {
          if (!KINDS.includes(body.kind)) return json({ error: 'Bad kind.' }, 400);
          sets.push('kind = ?'); vals.push(body.kind);
        }
        if (body.categoryId !== undefined) { sets.push('category_id = ?'); vals.push(clean(body.categoryId, 200) || null); }
        if (body.published !== undefined) { sets.push('published = ?'); vals.push(body.published ? 1 : 0); }
        if (!sets.length) return json({ error: 'Nothing to change.' }, 400);
        sets.push('updated_at = ?'); vals.push(now);
        vals.push(id);
        await db.prepare(`UPDATE resources SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
        const row = await db.prepare('SELECT * FROM resources WHERE id = ?').bind(id).first();
        if (!row) return json({ error: 'Not found.' }, 404);
        return json({ ok: true, item: rowToItem(row) });
      }

      return json({ error: 'Unknown action.' }, 400);
    }

    return json({ error: 'Method not allowed.' }, 405);
  } catch (err) {
    const msg = (err && err.message) || 'unknown';
    if (/no such table/i.test(msg)) {
      return json({ error: 'The resources tables do not exist yet. Run RESOURCES-SCHEMA.sql in the D1 console.', available: false }, 503);
    }
    return json({ error: 'Server error: ' + msg }, 500);
  }
}
