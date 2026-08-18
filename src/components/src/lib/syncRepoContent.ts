import { INITIAL_ARTICLES, INITIAL_CATEGORIES } from '../data/initialData';

/**
 * Makes content.json (in this repo) the source of truth for site content.
 *
 * The problem this solves:
 *   storage.ts only seeds localStorage when the key is missing. Once a browser
 *   had any content cached, it ignored the repo forever — so publishing a new
 *   article on GitHub never reached returning visitors, and the 22 articles in
 *   one admin's browser were invisible to everyone else.
 *
 * How it works:
 *   A short stamp (length + hash) is computed from the repo content at runtime.
 *   If it differs from the stamp last written to this browser, the cached copy
 *   is replaced. Editing content.json therefore updates every visitor on their
 *   next page load, with no version number to remember to bump.
 *
 * Trade-off, on purpose:
 *   Content edited in the /staff admin portal is local to that browser and will
 *   be overwritten the next time content.json changes. GitHub is authoritative.
 *   See README_CONTENT.md for how to export admin edits back into content.json.
 */

const DATA_KEYS = {
  categories: 'ngo_categories',
  articles: 'ngo_articles',
} as const;

const STAMP_KEYS = {
  categories: 'ngo_content_stamp_categories',
  articles: 'ngo_content_stamp_articles',
} as const;

function stampOf(value: unknown): string {
  const serialised = JSON.stringify(value) ?? '';
  // djb2 — small, fast, and good enough to detect "did this content change?"
  let hash = 5381;
  for (let i = 0; i < serialised.length; i++) {
    hash = ((hash * 33) ^ serialised.charCodeAt(i)) >>> 0;
  }
  return `${serialised.length}-${hash.toString(36)}`;
}

function syncOne(dataKey: string, stampKey: string, repoValue: unknown): boolean {
  const current = stampOf(repoValue);
  if (localStorage.getItem(stampKey) === current) return false;

  localStorage.setItem(dataKey, JSON.stringify(repoValue));
  localStorage.setItem(stampKey, current);
  return true;
}

export function syncRepoContent(): void {
  try {
    if (typeof localStorage === 'undefined') return;

    const categoriesChanged = syncOne(
      DATA_KEYS.categories,
      STAMP_KEYS.categories,
      INITIAL_CATEGORIES
    );
    const articlesChanged = syncOne(
      DATA_KEYS.articles,
      STAMP_KEYS.articles,
      INITIAL_ARTICLES
    );

    if (categoriesChanged || articlesChanged) {
      console.info(
        `[NGO Hub] Content refreshed from content.json — ` +
          `${INITIAL_CATEGORIES.length} categories, ${INITIAL_ARTICLES.length} articles.`
      );
    }
  } catch (error) {
    // Never block the app from rendering because of a storage problem
    // (private browsing, quota exceeded, storage disabled, etc.).
    console.warn('[NGO Hub] Could not sync content from repo:', error);
  }
}
