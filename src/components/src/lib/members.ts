import { User, LoginLog } from '../types';
import { getAdminKey } from './tickets';

/**
 * Talks to /api/users (Cloudflare D1).
 *
 * Visitors' browsers keep ONLY their own profile (ngo_current_user). The full
 * member list and login history live on the server and are only returned to
 * the admin portal, using the same admin key as the Support Tickets tab.
 */

const ENDPOINT = '/api/users';

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
}

function deviceLabel(): string {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const kind = /ipad|tablet/i.test(ua) ? 'Tablet' : /mobile/i.test(ua) ? 'Mobile' : 'Desktop';
  return `${browser} / ${kind}`;
}

async function call<T>(method: string, body?: unknown, admin = false): Promise<ApiResult<T>> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (admin) headers['x-admin-key'] = getAdminKey();
    const response = await fetch(ENDPOINT, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let parsed: any = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, status: response.status, error: 'Member accounts are not available on this server yet.' };
    }
    if (!response.ok) return { ok: false, status: response.status, error: parsed.error || 'Request failed.' };
    return { ok: true, data: parsed as T };
  } catch {
    return { ok: false, error: 'Could not reach the server. Please check your connection and try again.' };
  }
}

/* ------------------------------------------------------------------ member */

export async function registerMember(details: {
  name: string;
  email: string;
  organizationName: string;
  role: string;
  sector: string;
}): Promise<ApiResult<User>> {
  const r = await call<{ user: User }>('POST', { action: 'register', device: deviceLabel(), ...details });
  return r.ok ? { ok: true, data: r.data!.user } : { ok: false, error: r.error, status: r.status };
}

export async function loginMember(email: string): Promise<ApiResult<User>> {
  const r = await call<{ user: User }>('POST', { action: 'login', email, device: deviceLabel() });
  return r.ok ? { ok: true, data: r.data!.user } : { ok: false, error: r.error, status: r.status };
}

/** Fire-and-forget activity counter for the signed-in member. */
export function reportActivity(user: User, kind: 'view' | 'download' | 'bookmarks'): void {
  void call('POST', {
    action: 'activity',
    id: user.id,
    email: user.email,
    kind,
    savedResourceIds: kind === 'bookmarks' ? user.savedResourceIds : undefined,
  });
}

/* ------------------------------------------------------------------- admin */

let adminCache: { users: User[]; loginLogs: LoginLog[] } = { users: [], loginLogs: [] };

/** Last list fetched by the admin portal (in memory only, never saved). */
export function getCachedMembers() {
  return adminCache;
}

export async function fetchMembers(): Promise<ApiResult<{ users: User[]; loginLogs: LoginLog[] }>> {
  if (!getAdminKey()) {
    return { ok: false, status: 401, error: 'Enter the admin key (same as Support Tickets) to load members.' };
  }
  const r = await call<{ users: User[]; loginLogs: LoginLog[] }>('GET', undefined, true);
  if (r.ok && r.data) adminCache = { users: r.data.users || [], loginLogs: r.data.loginLogs || [] };
  return r;
}

export async function setMemberStatus(id: string, status: 'active' | 'suspended'): Promise<ApiResult<unknown>> {
  return call('PATCH', { id, status }, true);
}

export async function deleteMember(id: string): Promise<ApiResult<unknown>> {
  return call('DELETE', { id }, true);
}
