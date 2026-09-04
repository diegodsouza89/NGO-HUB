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
 * Deleting things: who is allowed to
 * ----------------------------------
 * content.json is NEVER allowed to delete. This code cannot tell "removed from
 * the repo" from "created in the portal", and silently deleting someone's
 * content is the mistake above.
 *
 * A PUBLISH is allowed to delete, because it is different in kind: it is a
 * complete snapshot of an admin's portal, sent deliberately by a person who
 * pressed a button. There, an item's absence really does mean "I removed this".
 *
 * On 2 September 2026 four categories were deleted in the portal and published,
 * and every browser went on showing all twelve. Two reasons, both fixed here:
 *
 *   1. Both sources wrote to ONE pair of stamp keys, so each invalidated the
 *      other's stamp. content.json was therefore re-merged on every single
 *      load, for ever, re-adding the four deleted categories each time. The
 *      stamps are now per source.
 *
 *   2. Nothing ever removed an item. A publish may now remove one, but only if
 *      the id came from an authoritative source in the first place — it is in
 *      the bundled content.json, or a previous publish contained it. An id that
 *      appears in neither was created in this browser and has never been
 *      published, so it is kept; that is a draft, not a deletion.
 */

const DATA_KEYS = {
  categories: 'ngo_categories',
  articles: 'ngo_articles',
} as const;

/**
 * One stamp per source per list. Sharing a stamp between content.json and the
 * published set meant each source invalidated the other, so neither was ever
 * skipped and content.json was re-applied on every load.
 */
const STAMP_KEYS = {
  repo: {
    categories: 'ngo_content_stamp_repo_categories',
    articles: 'ngo_content_stamp_repo_articles',
  },
  published: {
    categories: 'ngo_content_stamp_pub_categories',
    articles: 'ngo_content_stamp_pub_articles',
  },
} as const;

/** Set once a publish has been applied here; content.json then stands down. */
const PUBLISH_SEEN_KEY = 'ngo_content_publish_seen';

/**
 * Every id this browser has ever received from a publish. An id in here has
 * been published at least once, so its later absence from a publish is a
 * deletion rather than a draft that has not gone out yet.
 */
const PUBLISHED_ID_KEYS = {
  categories: 'ngo_content_published_ids_categories',
  articles: 'ngo_content_published_ids_articles',
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
 * Fields where a choice already made in THIS browser beats the incoming value.
 *
 * `icon` belongs here for content.json, because the portal has a picker for it
 * and an admin's choice must not be reset by a repo file that predates it.
 *
 * It must NOT apply to a publish. On 4 September 2026 four category icons were
 * changed in the portal and published, and no browser showed them: the
 * incoming icon arrived correctly and was then discarded in favour of the one
 * already stored. Publishing is a deliberate act by an admin, so for that
 * source the published icon is the answer — the same reasoning that lets a
 * publish delete, and content.json not.
 *
 * So this is passed in per source rather than being a constant.
 */
const REPO_PREFERS_LOCAL = ['icon'] as const;
const PUBLISH_PREFERS_LOCAL: readonly string[] = [];

function stampOf(value: unknown): string {
  const serialised = JSON.stringify(value) ?? '';
  // djb2 — small, fast, and good enough to answer "did content.json change?"
  let hash = 5381;
  for (let i = 0; i < serialised.length; i++) {
    hash = ((hash * 33) ^ serialised.charCodeAt(i)) >>> 0;
  }
  return `${serialised.length}-${hash.toString(36)}`;
}

function idsOf(list: Record<string, unknown>[]): string[] {
  const out: string[] = [];
  for (const item of list) {
    if (item && typeof item.id === 'string' && item.id) out.push(item.id);
  }
  return out;
}

function readIdSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []);
  } catch (e) {
    return new Set();
  }
}

function addToIdSet(key: string, ids: string[]): void {
  try {
    const merged = readIdSet(key);
    for (const id of ids) merged.add(id);
    localStorage.setItem(key, JSON.stringify(Array.from(merged)));
  } catch (e) {
    /* losing this list only means a later deletion is treated as a draft */
  }
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
  keepCounters: boolean,
  preferLocal: readonly string[]
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
    for (const field of preferLocal) {
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
  removedIds: string[];
}

/**
 * @param removableIds ids this source is entitled to delete when it omits
 *        them. Undefined means "this source may not delete anything", which is
 *        how content.json is always called.
 */
function mergeList(
  repoList: Record<string, unknown>[],
  localList: Record<string, unknown>[],
  keepCounters: boolean,
  preferLocal: readonly string[],
  removableIds?: Set<string>
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
    return mergeRecord(repoItem, localItem, keepCounters, preferLocal);
  });

  const repoIds = new Set(repoList.map((r) => (typeof r.id === 'string' ? r.id : '')));
  const localOnly = localList.filter(
    (item) => item && typeof item.id === 'string' && !repoIds.has(item.id)
  );

  // An item this source omits is only dropped when the source is entitled to
  // delete it. Anything else stays, exactly as before — an unpublished draft
  // must never disappear because someone else published.
  const removedIds: string[] = [];
  const kept: Record<string, unknown>[] = [];
  for (const item of localOnly) {
    const id = String(item.id);
    if (removableIds && removableIds.has(id)) removedIds.push(id);
    else kept.push(item);
  }

  const value = merged.concat(kept);
  return {
    changed: JSON.stringify(value) !== JSON.stringify(localList),
    value,
    keptLocalOnly: kept.length,
    keptTranslations,
    removedIds,
  };
}

function syncOne(
  dataKey: string,
  stampKey: string,
  backupKey: string,
  repoValue: Record<string, unknown>[],
  preferLocal: readonly string[],
  removableIds?: Set<string>
): MergeOutcome & { skipped: boolean } {
  // The stamp is taken over the repo content exactly as it appears in
  // content.json. Nothing derived, so no change to this file can trigger a
  // refresh.
  const current = stampOf(repoValue);
  const stored = localStorage.getItem(stampKey);
  const local = readList(dataKey);

  if (stored === current && local.length > 0) {
    return {
      skipped: true,
      changed: false,
      value: local,
      keptLocalOnly: 0,
      keptTranslations: 0,
      removedIds: [],
    };
  }

  const outcome = mergeList(repoValue, local, local.length > 0, preferLocal, removableIds);

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
  source: string,
  stamps: { categories: string; articles: string },
  preferLocal: readonly string[],
  removable?: { categories: Set<string>; articles: Set<string> }
): boolean {
  const categories = syncOne(
    DATA_KEYS.categories,
    stamps.categories,
    BACKUP_KEYS.categories,
    categoriesIn,
    preferLocal,
    removable && removable.categories
  );
  const articles = syncOne(
    DATA_KEYS.articles,
    stamps.articles,
    BACKUP_KEYS.articles,
    articlesIn,
    preferLocal,
    removable && removable.articles
  );

  if (categories.skipped && articles.skipped) return false;

  const kept = articles.keptTranslations + categories.keptTranslations;
  const extra = articles.keptLocalOnly + categories.keptLocalOnly;
  const gone = categories.removedIds.concat(articles.removedIds);
  console.info(
    `[NGO Hub] Content merged from ${source} — ` +
      `${categoriesIn.length} categories, ${articlesIn.length} articles` +
      (kept ? `, kept ${kept} local translation${kept === 1 ? '' : 's'}` : '') +
      (extra ? `, kept ${extra} item${extra === 1 ? '' : 's'} not in the source` : '') +
      (gone.length ? `, removed ${gone.length} deleted in the portal (${gone.join(', ')})` : '') +
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

    // Which absences count as deletions. An id is fair game only if it came
    // from an authoritative source: the bundled content.json, or a publish
    // this browser has already seen. Anything else was created here and has
    // never been published, so it is a draft and is kept.
    //
    // This is computed BEFORE the ids of this publish are recorded, otherwise
    // every item would look previously-published and the distinction would
    // collapse.
    const removable = {
      categories: new Set(
        idsOf(INITIAL_CATEGORIES as unknown as Record<string, unknown>[]).concat(
          Array.from(readIdSet(PUBLISHED_ID_KEYS.categories))
        )
      ),
      articles: new Set(
        idsOf(INITIAL_ARTICLES as unknown as Record<string, unknown>[]).concat(
          Array.from(readIdSet(PUBLISHED_ID_KEYS.articles))
        )
      ),
    };

    const changed = mergeFrom(
      categories as Record<string, unknown>[],
      articles as Record<string, unknown>[],
      'the admin portal',
      STAMP_KEYS.published,
      // A published icon is the admin's choice and must win, unlike one that
      // merely sits in content.json.
      PUBLISH_PREFERS_LOCAL,
      removable
    );

    addToIdSet(PUBLISHED_ID_KEYS.categories, idsOf(categories as Record<string, unknown>[]));
    addToIdSet(PUBLISHED_ID_KEYS.articles, idsOf(articles as Record<string, unknown>[]));
    try {
      // From here on content.json stands down: what an admin published is
      // newer than what happened to be in the build.
      localStorage.setItem(PUBLISH_SEEN_KEY, '1');
    } catch (e) {
      /* worst case content.json keeps merging, which is the old behaviour */
    }

    return changed;
  } catch (error) {
    console.warn('[NGO Hub] Could not load published content, using the bundled copy:', error);
    return false;
  }
}

export function syncRepoContent(): void {
  try {
    if (typeof localStorage === 'undefined') return;

    // Once anything has been published, the published set is the source of
    // truth and this must not run at all. It cannot delete, so re-merging a
    // content.json that predates the publish quietly re-added four categories
    // an admin had deleted — every load, because the publish then corrected
    // only the items it still contained.
    //
    // A browser that has never seen a publish is unaffected: storage.ts still
    // seeds from content.json, and this still keeps it up to date.
    if (localStorage.getItem(PUBLISH_SEEN_KEY) === '1') return;

    mergeFrom(
      INITIAL_CATEGORIES as unknown as Record<string, unknown>[],
      INITIAL_ARTICLES as unknown as Record<string, unknown>[],
      'content.json',
      STAMP_KEYS.repo,
      REPO_PREFERS_LOCAL
    );
  } catch (error) {
    // Never block the app from rendering because of a storage problem
    // (private browsing, quota exceeded, storage disabled).
    console.warn('[NGO Hub] Could not sync content from repo:', error);
  }
}
