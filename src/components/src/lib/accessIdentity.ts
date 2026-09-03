/**
 * Who Cloudflare Access says you are.
 *
 * Why this exists
 * ---------------
 * The admin password lives in localStorage, which means it is a DIFFERENT
 * password in every browser. Set one on the office laptop and it is unknown in
 * incognito, on a phone, or on a colleague's machine — where the site instead
 * falls back to the password shipped in the build. That is both confusing and
 * weak, and no amount of work on the password screen can fix it: content is
 * synced between browsers, settings are not.
 *
 * Cloudflare Access solves it a level up. With an Access application in front
 * of /staff, Cloudflare checks identity BEFORE the page is served — the same
 * email login in every browser, incognito included, with nothing stored
 * locally and nothing to forget. When that has happened, asking for a password
 * as well is pointless: the person has already proved who they are, to a
 * stronger standard than the password screen can manage.
 *
 * So: if Access vouches for you, go straight in.
 *
 * This degrades on purpose. Before Access is configured — or if the check
 * fails for any reason — the endpoint does not answer with an identity and the
 * password screen behaves exactly as it does today. Nobody is locked out by
 * adding this file, and nobody is locked out if Cloudflare has a bad minute.
 *
 * What this is NOT
 * ----------------
 * This is a convenience check running in the browser, and a person with
 * developer tools can make any browser code say what they like. It is not the
 * thing protecting /staff — the Access application is, at the edge, before the
 * page exists. If Access is not configured, this returns nothing and changes
 * nothing.
 */

export interface AccessIdentity {
  /** True only when Cloudflare returned a real, named identity. */
  ok: boolean;
  /** Shown in the portal so it is obvious who is signed in. */
  email?: string;
}

/** Served by Cloudflare itself, not by this site's code. */
const IDENTITY_URL = '/cdn-cgi/access/get-identity';

/**
 * A page must never wait on this. Learned from the published-content fetch,
 * which had no limit and left the site hanging on a server that accepted the
 * connection and never replied.
 */
const TIMEOUT_MS = 5000;

export async function checkAccessIdentity(): Promise<AccessIdentity> {
  try {
    if (typeof fetch !== 'function') return { ok: false };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(IDENTITY_URL, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    // Read the body even when the answer is going to be discarded, so the
    // connection is released rather than left pending.
    const text = await res.text();
    if (!res.ok) return { ok: false };

    // Without Access this path can answer with something that is not JSON at
    // all, so parse defensively rather than trusting the status code.
    let data: { email?: unknown; name?: unknown };
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false };
    }

    const email =
      typeof data.email === 'string' && data.email.trim()
        ? data.email.trim()
        : typeof data.name === 'string' && data.name.trim()
          ? data.name.trim()
          : '';

    // An empty identity is not an identity. Anything short of a named person
    // falls through to the password screen.
    if (!email) return { ok: false };

    return { ok: true, email };
  } catch (error) {
    return { ok: false };
  }
}
