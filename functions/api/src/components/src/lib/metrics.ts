import { Language } from '../types';
import { getAdminKey } from './tickets';

/**
 * Talks to /api/metrics (Cloudflare D1).
 *
 * Views and downloads are sent to the server so the admin dashboard shows the
 * same numbers on every browser. Nothing about other visitors is kept in this
 * browser; the admin's last fetched summary is held in memory only.
 */

const ENDPOINT = '/api/metrics';

export interface ServerMetrics {
  totals: { views: number; downloads: number };
  visitorsInRange: number;
  days: number;
  from: string;
  articles: Record<string, { views: number; downloads: number }>;
  byDate: Record<string, { views: number; downloads: number; visitors: number }>;
  generatedAt: string;
}

/** Fire-and-forget. keepalive lets a download event survive window.print(). */
export function trackArticleEvent(
  kind: 'view' | 'download',
  articleId: string,
  language: Language = 'en',
  userId?: string
): void {
  try {
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, articleId, language, userId }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* analytics must never break the page */
  }
}

let cache: ServerMetrics | null = null;
let lastError: string | null = null;

/** Last summary fetched by the admin portal, or null if none yet. */
export function getCachedMetrics(): ServerMetrics | null {
  return cache;
}

export function getMetricsError(): string | null {
  return lastError;
}

export async function fetchMetrics(days = 14): Promise<{ ok: boolean; error?: string }> {
  const key = getAdminKey();
  if (!key) {
    lastError = 'Enter the admin key (same as Support Tickets) to load live metrics.';
    return { ok: false, error: lastError };
  }
  try {
    const res = await fetch(`${ENDPOINT}?days=${days}`, { headers: { 'x-admin-key': key } });
    const text = await res.text();
    let body: any;
    try {
      body = JSON.parse(text);
    } catch {
      lastError = 'Live metrics are not available on this server yet.';
      return { ok: false, error: lastError };
    }
    if (!res.ok) {
      lastError = body.error || 'Could not load metrics.';
      return { ok: false, error: lastError };
    }
    cache = body as ServerMetrics;
    lastError = null;
    return { ok: true };
  } catch {
    lastError = 'Could not reach the server to load metrics.';
    return { ok: false, error: lastError };
  }
}

/** YYYY-MM-DD in India time, matching how the server buckets events. */
export function istDateKey(ms: number): string {
  return new Date(ms + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
