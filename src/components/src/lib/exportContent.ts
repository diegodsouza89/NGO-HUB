import { Article, Category, Language } from '../types';

/**
 * Turns what is in this browser back into content.json.
 *
 * Why this exists:
 *   The admin portal writes to localStorage. content.json in the GitHub repo is
 *   what every visitor actually sees, and syncRepoContent replaces the local
 *   copy whenever that file changes. So an article written in the portal is
 *   invisible to everyone else and disappears at the next content update.
 *
 *   Until now the only way across that gap was a snippet pasted into the
 *   browser console. This produces the same file from a button.
 *
 * The output is byte-comparable with the file in the repo: same key order, same
 * two-space indent, same trailing newline. That keeps the diff on GitHub down to
 * what actually changed, instead of reformatting all 270 KB.
 */

/** Language order used in the repo file. */
const LANGUAGE_ORDER: Language[] = ['en', 'hi', 'mr', 'ta', 'te', 'bn', 'gu', 'kn'];

/** Keys a category carries, in the order content.json uses. */
const CATEGORY_KEYS = ['id', 'slug', 'icon', 'order', 'names', 'descriptions'] as const;

/** Keys an article carries, in the order content.json uses. */
const ARTICLE_KEYS = [
  'id', 'slug', 'categoryId', 'published', 'resourceType', 'sector',
  'downloadsCount', 'bookmarkCount', 'views', 'helpfulYes', 'helpfulNo',
  'updatedAt', 'tags', 'titles', 'bodies',
] as const;

/** Optional keys, emitted only when the article actually has them. */
const ARTICLE_OPTIONAL_KEYS = ['downloadUrl', 'fileType', 'fileSize'] as const;

/**
 * Engagement counters are always written as zero.
 *
 * syncRepoContent zeroes them for every visitor when it seeds from this file,
 * so any number stored here is discarded on arrival. Writing real-looking
 * figures into the repo would only mislead whoever reads it next.
 */
const ZEROED_COUNTERS = ['downloadsCount', 'bookmarkCount', 'views', 'helpfulYes', 'helpfulNo'];

function orderedLanguageMap(source: unknown): Record<string, string> {
  const input = (source || {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  // Known languages first, in the repo's order.
  for (const code of LANGUAGE_ORDER) {
    if (Object.prototype.hasOwnProperty.call(input, code)) {
      out[code] = String(input[code] ?? '');
    }
  }
  // Anything unexpected is preserved rather than silently dropped.
  for (const code of Object.keys(input)) {
    if (!Object.prototype.hasOwnProperty.call(out, code)) out[code] = String(input[code] ?? '');
  }
  return out;
}

function normaliseCategory(category: Category): Record<string, unknown> {
  const source = category as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of CATEGORY_KEYS) {
    if (key === 'names' || key === 'descriptions') out[key] = orderedLanguageMap(source[key]);
    else if (key === 'order') out[key] = Number(source[key]) || 0;
    else out[key] = source[key] ?? '';
  }
  return out;
}

function normaliseArticle(article: Article): Record<string, unknown> {
  const source = article as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of ARTICLE_KEYS) {
    if (key === 'titles' || key === 'bodies') out[key] = orderedLanguageMap(source[key]);
    else if (ZEROED_COUNTERS.indexOf(key) !== -1) out[key] = 0;
    else if (key === 'published') out[key] = Boolean(source[key]);
    else if (key === 'tags') out[key] = Array.isArray(source[key]) ? (source[key] as string[]).map(String) : [];
    else out[key] = source[key] ?? '';
  }
  for (const key of ARTICLE_OPTIONAL_KEYS) {
    const value = source[key];
    if (value !== undefined && value !== null && String(value) !== '') out[key] = String(value);
  }
  return out;
}

/** The exact text to save as content.json. */
export function buildContentJson(categories: Category[], articles: Article[]): string {
  const payload = {
    categories: [...categories]
      .sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.id).localeCompare(String(b.id)))
      .map(normaliseCategory),
    articles: [...articles]
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
      .map(normaliseArticle),
  };
  return JSON.stringify(payload, null, 2) + '\n';
}

export interface ContentSummary {
  categories: number;
  articles: number;
  published: number;
  drafts: number;
  /** Articles with a non-empty body, per language. */
  coverage: Array<{ code: Language; translated: number }>;
  bytes: number;
}

export function summariseContent(
  categories: Category[],
  articles: Article[],
  json: string
): ContentSummary {
  const published = articles.filter((a) => a.published).length;
  const coverage = LANGUAGE_ORDER.map((code) => ({
    code,
    translated: articles.filter((a) => String((a.bodies || {})[code] || '').trim()).length,
  }));
  return {
    categories: categories.length,
    articles: articles.length,
    published,
    drafts: articles.length - published,
    coverage,
    bytes: new Blob([json]).size,
  };
}

/**
 * Save the file. Returns false when the browser blocks it (some in-app
 * browsers do) so the caller can say so rather than appearing to do nothing.
 */
export function downloadContentJson(json: string, fileName = 'content.json'): boolean {
  try {
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Revoke on the next tick; revoking immediately cancels the download in
    // some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (error) {
    console.warn('[NGO Hub] Could not save content.json:', error);
    return false;
  }
}
