/**
 * Cloudflare Pages middleware - abuse guard for /api/* endpoints.
 *
 * /api/translate calls Google Gemini with our API key and had no protection at
 * all, so anyone who found the URL could call it in a loop and burn the key's
 * quota. This runs BEFORE every function, so translate.js needs no changes.
 *
 * Three cheap, independent controls:
 *   1. Same-origin only - blocks other sites and scripted requests (curl, bots)
 *                         that send no Origin/Referer header.
 *   2. Request size cap - bounds how many tokens one call can cost.
 *   3. Optional secret  - if TRANSLATE_SECRET is set in Cloudflare, callers must
 *                         send a matching x-translate-secret header. Off by
 *                         default, so nothing breaks until you enable it.
 *
 * Honest limit: an attacker can forge an Origin header, so treat this as a speed
 * bump, not a lock. The real cost ceiling is a quota limit on the key itself in
 * Google AI Studio / Google Cloud. Please set one.
 */

const MAX_BODY_BYTES = 128 * 1024;

function json(bodyObj, status) {
  return new Response(JSON.stringify(bodyObj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function hostOf(value) {
  try {
    return new URL(value).host;
  } catch (e) {
    return null;
  }
}

function isLocalHost(host) {
  return /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host || '');
}

function safeEqual(a, b) {
  const x = String(a == null ? '' : a);
  const y = String(b == null ? '' : b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) {
    diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  }
  return diff === 0;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

// Static assets and page loads pass straight through.
if (!url.pathname.startsWith('/api/')) {
  return next();
}

if (request.method === 'OPTIONS') {
  return new Response(null, { status: 204 });
}

// Reads are harmless; only guard calls that cost money.
if (request.method !== 'POST') {
  return next();
}

// 1. Same-origin only.
const selfHost = url.host;
  const originHost = hostOf(request.headers.get('Origin'));
  const refererHost = hostOf(request.headers.get('Referer'));
  const claimedHost = originHost || refererHost;

const sameOrigin =
  claimedHost === selfHost ||
  (isLocalHost(selfHost) && isLocalHost(claimedHost));

if (!sameOrigin) {
  return json({ error: 'This endpoint can only be called from the NGO Knowledge Hub admin portal.' }, 403);
}

// 2. Request size cap.
const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > MAX_BODY_BYTES) {
    return json({ error: 'That request is too large. Split the article into shorter sections and translate each one.' }, 413);
  }

// 3. Optional shared secret, only enforced when configured.
const expected = env.TRANSLATE_SECRET;
  if (expected) {
    const supplied = request.headers.get('x-translate-secret');
    if (!safeEqual(supplied, expected)) {
      return json({ error: 'Missing or invalid API secret.' }, 401);
    }
  }

return next();
}
