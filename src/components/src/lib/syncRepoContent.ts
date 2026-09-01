import { INITIAL_ARTICLES, INITIAL_CATEGORIES } from '../data/initialData';

/**
 * Keeps content.json (in this repo) as the source of truth for site content,
 * WITHOUT destroying anything that only exists in this browser.
 *
 * The problem this solves
 * -----------------------
 * storage.ts only seeds localStorage when the key is missing. Once a browser had
 * any content cached it ignored the repo forever, so publishing a new article on
 * GitHub never reached returning visitors.
 *
 * The problem the first version of this file CAUSED
 * ------------------------------------------------
 * It replaced the local copy outright whenever a short hash of the repo content
 * changed. On 21 August 2026 the hash was being computed over a *derived* value
 * (the articles with their counters zeroed). Editing that derivation changed the
 * hash even though content.json had not changed at all — so every browser
 * decided the content was new and overwrote its local copy. A week of
 * translations typed into the /staff portal was destroyed, silently, with no
 * backup. That is the bug this rewrite exists to make impossible.
 *
 * Two changes, and the order matters
 * ----------------------------------
 * 1. MERGE instead of replace. The repo wins for anything it actually defines;
 *    anything only this browser has — a translation, a draft article, real view
 *    counts — is kept. This had to come first, because fixing (2) alters the
 *    hash and therefore forces one last refresh. With merging in place that
 *    refresh is harmless.
 *
 * 2. Hash the raw repo content, not a derived value. No future edit to this
 *    file can trigger a refresh; only an actual change to content.json can.
 *
 * A copy of the previous local content is kept under the BACKUP_KEYS below
 * before anything is written, so even a merge that behaves unexpectedly is
 * recoverable from the browser console.
 *
 * Deliberate trade-off: an article deleted from content.json is NOT deleted
 * here, because this code cannot tell "removed from the repo" from "created in
 * the portal". Silently deleting someone's content is the mistake above; leaving
 * an extra row for an admin to remove is not.
 */

const DATA_KEYS = {
  categories: 'ngo_categories',
  articles: 'ngo_articles',
} as const;

const STAMP_KEYS = {
  categories: 'ngo_content_stamp_categories',
  articles: 'ngo_content_stamp_articles',
} as const;

const BACKUP_KEYS = {
  categories: 'ngo_categories_before_last_sync',
  articles: 'ngo_articles_before_last_sync',
} as const;

/** Counters are runtime measurements, never content. */
const COUNTER_FIELDS = ['views', 'downloadsCount', 'bookmarkCount', 'helpfulYes', 'helpfulNo'] as const;

/** Per-language maps that must be merged rather than replaced. */
const TEXT_MAPS = ['titles', 'bodies', 'names', 'descriptions'] as const;

/**
 * Fields the admin portal invites someone to change, which are presentation
 * rather than content. A choice made in the portal is kept.
 *
 * `icon` is here because the portal has a picker for it and admins were told to
 * use it. Without this, the one refresh that fixing the hash forces would reset
 * every icon back to the repo value — repeating the same silent loss in a
 * smaller way. The cost is that changing an icon in content.json will not
 * override a browser where it was set in the portal; use the portal, or clear
 * that browser's data.
 */
const LOCAL_PREFERENCE_FIELDS = ['icon'] as const;

function stampOf(value: unknown): string {
  const serialised = JSON.stringify(value) ?? '';
  // djb2 — small, fast, and good enough to answer "did content.json change?"
  let hash = 5381;
  for (let i = 0; i < serialised.length; i++) {
    hash = ((hash * 33) ^ serialised.charCodeAt(i)) >>> 0;
  }
  return `${serialised.length}-${hash.toString(36)}`;
}

function readList(key: string): Record<string, unknown>[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
  } catch (e) {
    return [];
  }
}

const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

/**
 * Repo text wins where the repo has text. A language the repo leaves empty or
 * absent keeps whatever this browser holds — that is the translation typed into
 * the portal, and it is the thing that used to be thrown away.
 */
function mergeTextMap(
  repoMap: Record<string, unknown> | undefined,
  localMap: Record<string, unknown> | undefined
): Record<string, unknown> {
  const out: Record<string, unknown> = Object.assign({}, localMap || {});
  const repo = repoMap || {};
  for (const lang of Object.keys(repo)) {
    if (hasText(repo[lang]) || !hasText(out[lang])) out[lang] = repo[lang];
  }
  return out;
}

function mergeRecord(
  repoItem: Record<string, unknown>,
  localItem: Record<string, unknown> | undefined,
  keepCounters: boolean
): Record<string, unknown> {
  const merged: Record<string, unknown> = Object.assign({}, repoItem);

  for (const field of TEXT_MAPS) {
    if (repoItem[field] !== undefined || (localItem && localItem[field] !== undefined)) {
      merged[field] = mergeTextMap(
        repoItem[field] as Record<string, unknown> | undefined,
        localItem ? (localItem[field] as Record<string, unknown> | undefined) : undefined
      );
    }
  }

  if (localItem) {
    for (const field of LOCAL_PREFERENCE_FIELDS) {
      if (hasText(localItem[field])) merged[field] = localItem[field];
    }
  }

  for (const field of COUNTER_FIELDS) {
    if (!(field in repoItem)) continue;
    // A fresh browser starts from zero rather than inheriting the demo figures
    // that were typed into content.json. A browser with real counts keeps them.
    merged[field] = keepCounters && localItem ? localItem[field] ?? 0 : 0;
  }

  return merged;
}

interface MergeOutcome {
  changed: boolean;
  value: Record<string, unknown>[];
  keptLocalOnly: number;
  keptTranslations: number;
}

function mergeList(
  repoList: Record<string, unknown>[],
  localList: Record<string, unknown>[],
  keepCounters: boolean
): MergeOutcome {
  const localById = new Map<string, Record<string, unknown>>();
  for (const item of localList) {
    const id = item && typeof item.id === 'string' ? item.id : '';
    if (id) localById.set(id, item);
  }

  let keptTranslations = 0;
  const merged = repoList.map((repoItem) => {
    const id = typeof repoItem.id === 'string' ? repoItem.id : '';
    const localItem = id ? localById.get(id) : undefined;
    if (localItem) {
      for (const field of TEXT_MAPS) {
        const repoMap = (repoItem[field] || {}) as Record<string, unknown>;
        const localMap = (localItem[field] || {}) as Record<string, unknown>;
        for (const lang of Object.keys(localMap)) {
          if (hasText(localMap[lang]) && !hasText(repoMap[lang])) keptTranslations += 1;
        }
      }
    }
    return mergeRecord(repoItem, localItem, keepCounters);
  });

  const repoIds = new Set(repoList.map((r) => (typeof r.id === 'string' ? r.id : '')));
  const localOnly = localList.filter(
    (item) => item && typeof item.id === 'string' && !repoIds.has(item.id)
  );

  const value = merged.concat(localOnly);
  return {
    changed: JSON.stringify(value) !== JSON.stringify(localList),
    value,
    keptLocalOnly: localOnly.length,
    keptTranslations,
  };
}

function syncOne(
  dataKey: string,
  stampKey: string,
  backupKey: string,
  repoValue: Record<string, unknown>[]
): MergeOutcome & { skipped: boolean } {
  // The stamp is taken over the repo content exactly as it appears in
  // content.json. Nothing derived, so no change to this file can trigger a
  // refresh.
  const current = stampOf(repoValue);
  const stored = localStorage.getItem(stampKey);
  const local = readList(dataKey);

  if (stored === current && local.length > 0) {
    return { skipped: true, changed: false, value: local, keptLocalOnly: 0, keptTranslations: 0 };
  }

  const outcome = mergeList(repoValue, local, local.length > 0);

  // Keep one copy of what was here before, so an unexpected merge is
  // recoverable: JSON.parse(localStorage.getItem('ngo_articles_before_last_sync'))
  if (local.length > 0) {
    try {
      localStorage.setItem(backupKey, JSON.stringify(local));
    } catch (e) {
      /* a missing backup must not stop the sync */
    }
  }

  localStorage.setItem(dataKey, JSON.stringify(outcome.value));
  localStorage.setItem(stampKey, current);
  return Object.assign({ skipped: false }, outcome);
}

/**
 * Merge one source of content into this browser. Shared by the bundled
 * content.json path and the published-from-D1 path so there is exactly one
 * merge implementation — the one that was fixed after it destroyed a week of
 * translations, and that has a test proving local text survives.
 */
function mergeFrom(
  categoriesIn: Record<string, unknown>[],
  articlesIn: Record<string, unknown>[],
  source: string
): boolean {
  const categories = syncOne(
    DATA_KEYS.categories,
    STAMP_KEYS.categories,
    BACKUP_KEYS.categories,
    categoriesIn
  );
  const articles = syncOne(DATA_KEYS.articles, STAMP_KEYS.articles, BACKUP_KEYS.articles, articlesIn);

  if (categories.skipped && articles.skipped) return false;

  const kept = articles.keptTranslations + categories.keptTranslations;
  const extra = articles.keptLocalOnly + categories.keptLocalOnly;
  console.info(
    `[NGO Hub] Content merged from ${source} — ` +
      `${categoriesIn.length} categories, ${articlesIn.length} articles` +
      (kept ? `, kept ${kept} local translation${kept === 1 ? '' : 's'}` : '') +
      (extra ? `, kept ${extra} item${extra === 1 ? '' : 's'} not in the source` : '') +
      '.'
  );
  return categories.changed || articles.changed;
}

/**
 * Pull whatever the admin portal last published, and merge it in.
 *
 * Falls back silently to the content.json shipped in the build whenever the
 * endpoint is missing, erroring, or has nothing published yet. Publishing is
 * an upgrade to how content reaches visitors, never something the site
 * depends on to render.
 *
 * @returns true when the local copy actually changed, so the caller can
 *          re-read it into React state.
 */
export async function syncPublishedContent(): Promise<boolean> {
  try {
    if (typeof localStorage === 'undefined' || typeof fetch !== 'function') return false;

    // A request with no time limit can hang the page: a server that accepts
    // the connection and never answers leaves the site waiting indefinitely.
    // Seen in testing against a server with no route for this path.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let res: Response;
    try {
      res = await fetch('/api/content', {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    // Always read the body, even when the response is going to be ignored.
    // Returning early without consuming it leaves the connection open: the
    // page kept a pending request forever and never reached network idle.
    const text = await res.text();
    if (!res.ok) return false;

    // An unrouted path on a single-page site answers with the app's own HTML
    // and a 200, so parse defensively rather than trusting the status.
    let data: { published?: boolean; categories?: unknown; articles?: unknown };
    try {
      data = JSON.parse(text);
    } catch {
      return false;
    }
    if (!data || data.published !== true) return false;

    const categories = Array.isArray(data.categories) ? data.categories : [];
    const articles = Array.isArray(data.articles) ? data.articles : [];
    // An empty publish would blank the site. The endpoint refuses to store
    // one; this refuses to apply one, so a bug at either end cannot do it.
    if (!categories.length && !articles.length) return false;

    return mergeFrom(categories, articles, 'the admin portal');
  } catch (error) {
    console.warn('[NGO Hub] Could not load published content, using the bundled copy:', error);
    return false;
  }
}

export function syncRepoContent(): void {
  try {
    if (typeof localStorage === 'undefined') return;

    mergeFrom(
      INITIAL_CATEGORIES as unknown as Record<string, unknown>[],
      INITIAL_ARTICLES as unknown as Record<string, unknown>[],
      'content.json'
    );
  } catch (error) {
    // Never block the app from rendering because of a storage problem
    // (private browsing, quota exceeded, storage disabled).
    console.warn('[NGO Hub] Could not sync content from repo:', error);
  }
}
