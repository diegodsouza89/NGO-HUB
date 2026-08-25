/**
 * Admin password handling for the /staff portal.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * AdminLogin used to accept a hard-coded string as well as the configured
 * password:
 *
 *     if (password === savedPasswordHash || password === 'changeme123')
 *
 * That second test is a permanent back door. Changing the password in Settings
 * did not close it, because the literal was compiled into the bundle that every
 * visitor downloads. It is gone.
 *
 * Two further changes:
 *   - The password is stored as a PBKDF2-SHA-256 hash with a random per-install
 *     salt, so the value sitting in localStorage is no longer the password.
 *     The field was already called adminPasswordHash; now it actually is one.
 *   - Repeated wrong guesses are slowed down, and the delay survives a refresh.
 *
 * WHAT THIS DOES NOT DO - please read
 * -----------------------------------
 * /staff is a screen in a JavaScript bundle that is served to everybody. A
 * person who opens developer tools can set the "logged in" flag by hand and see
 * the admin screens without any password at all. Nothing in this file prevents
 * that, and no client-side code can.
 *
 * Everything the admin portal edits already lives in that same browser, so the
 * exposure is limited - there is no server holding other people's data behind
 * this screen. But if you want /staff to be a real boundary, put Cloudflare
 * Access in front of the path. It is free for up to 50 people, needs no code,
 * and checks identity before the page is ever served. ADMIN-SECURITY.md has the
 * steps.
 */

/** The value shipped in initialData. Used only to warn that it is unchanged. */
export const DEFAULT_PASSWORD = 'changeme123';

const PREFIX = 'pbkdf2$';
const ITERATIONS = 210000;
const KEY_BITS = 256;

const LOCKOUT_KEY = 'ngo_hub_admin_login_throttle';
const FREE_ATTEMPTS = 5;
const BASE_LOCK_MS = 60 * 1000;
const MAX_LOCK_MS = 15 * 60 * 1000;

/* ------------------------------------------------------------------ helpers */

function subtle(): SubtleCrypto | null {
  // crypto.subtle only exists in a secure context (https, or localhost during
  // development). Over plain http it is undefined, so callers must cope.
  const c = typeof crypto !== 'undefined' ? crypto : undefined;
  return c && c.subtle ? c.subtle : null;
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromBase64(value: string): Uint8Array {
  const raw = atob(value);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Length-independent comparison, so timing does not leak the password. */
export function safeEqual(a: string, b: string): boolean {
  const x = String(a == null ? '' : a);
  const y = String(b == null ? '' : b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const api = subtle();
  if (!api) throw new Error('WebCrypto unavailable');
  const material = await api.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await api.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    material,
    KEY_BITS
  );
  return toBase64(new Uint8Array(bits));
}

/* ------------------------------------------------------------------- public */

export function isHashed(stored: string): boolean {
  return typeof stored === 'string' && stored.indexOf(PREFIX) === 0;
}

/** Can we hash at all? False over plain http, where we fall back to legacy. */
export function canHash(): boolean {
  return subtle() !== null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return PREFIX + ITERATIONS + '$' + toBase64(salt) + '$' + hash;
}

/**
 * True when `password` matches `stored`.
 *
 * Accepts both formats: the new pbkdf2$... form, and the plain string that
 * existing installs still have in localStorage, so nobody is locked out by the
 * upgrade. It does NOT accept DEFAULT_PASSWORD unless that genuinely is the
 * configured password - that was the bug.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!password || !stored) return false;

  if (!isHashed(stored)) {
    return safeEqual(password, stored);
  }

  const parts = stored.split('$');
  // pbkdf2 $ iterations $ salt $ hash
  if (parts.length !== 4) return false;
  const iterations = parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  try {
    const candidate = await derive(password, fromBase64(parts[2]), iterations);
    return safeEqual(candidate, parts[3]);
  } catch (e) {
    return false;
  }
}

/** True when the configured password is still the one we shipped. */
export async function isDefaultPassword(stored: string): Promise<boolean> {
  if (!stored) return true;
  if (!isHashed(stored)) return safeEqual(stored, DEFAULT_PASSWORD);
  return verifyPassword(DEFAULT_PASSWORD, stored);
}

/* ----------------------------------------------------------------- throttle */

interface Throttle {
  failures: number;
  until: number;
}

function readThrottle(): Throttle {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    if (!raw) return { failures: 0, until: 0 };
    const parsed = JSON.parse(raw);
    return {
      failures: Number(parsed.failures) || 0,
      until: Number(parsed.until) || 0,
    };
  } catch (e) {
    return { failures: 0, until: 0 };
  }
}

function writeThrottle(state: Throttle): void {
  try {
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify(state));
  } catch (e) {
    /* storage full or blocked - throttling is a nicety, not a guarantee */
  }
}

/** Milliseconds the login form should stay locked, 0 when it is open. */
export function lockedForMs(now?: number): number {
  const t = readThrottle();
  const stamp = now === undefined ? Date.now() : now;
  return t.until > stamp ? t.until - stamp : 0;
}

/**
 * Record a wrong password. The first few are free so a typo is not punished;
 * after that the wait doubles each time, up to fifteen minutes.
 */
export function recordFailure(now?: number): number {
  const stamp = now === undefined ? Date.now() : now;
  const t = readThrottle();
  const failures = t.failures + 1;
  let until = 0;
  if (failures > FREE_ATTEMPTS) {
    const step = failures - FREE_ATTEMPTS - 1;
    const wait = Math.min(BASE_LOCK_MS * Math.pow(2, step), MAX_LOCK_MS);
    until = stamp + wait;
  }
  writeThrottle({ failures, until });
  return until > stamp ? until - stamp : 0;
}

export function clearFailures(): void {
  try {
    localStorage.removeItem(LOCKOUT_KEY);
  } catch (e) {
    /* nothing to do */
  }
}

/** "2 minutes" / "45 seconds", for the message on the login form. */
export function describeWait(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return seconds + (seconds === 1 ? ' second' : ' seconds');
  const minutes = Math.ceil(seconds / 60);
  return minutes + (minutes === 1 ? ' minute' : ' minutes');
}
