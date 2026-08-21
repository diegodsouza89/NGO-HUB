import { Article, Language } from '../types';

/**
 * Shared retrieval helpers.
 *
 * Both the hero search box and the Ask-AI widget need the same three things:
 * pick the right language, turn markdown into plain prose, and rank articles
 * against a query. Keeping them here stops the two from drifting apart.
 */

/** Value for the current language, falling back to English, then to a default. */
export function pickLang<T>(
  map: Partial<Record<Language, T>> | undefined,
  lang: Language,
  fallback: T
): T {
  if (!map) return fallback;
  const value = map[lang];
  if (value !== undefined && value !== null && value !== ('' as unknown as T)) return value;
  const english = map.en;
  if (english !== undefined && english !== null) return english;
  return fallback;
}

/** Markdown to readable plain text, for snippets, matching and AI context. */
export function flattenMarkdown(text: string): string {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/#{1,6}[ \t]+/g, ' ')
    .replace(/[*_`>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Phrase matches count for much more than incidental word matches. */
export function scoreText(
  haystack: string,
  query: string,
  words: string[],
  phraseWeight: number,
  wordWeight: number
): number {
  let score = 0;
  if (query && haystack.includes(query)) score += phraseWeight;
  for (const w of words) {
    if (haystack.includes(w)) score += wordWeight;
  }
  return score;
}

export function scoreArticle(article: Article, query: string, words: string[], lang: Language): number {
  const title = pickLang(article.titles, lang, '').toLowerCase();
  const body = flattenMarkdown(pickLang(article.bodies, lang, '')).toLowerCase();
  const tags = (article.tags || []).join(' ').toLowerCase();
  return (
    scoreText(title, query, words, 40, 14) +
    scoreText(tags, query, words, 16, 6) +
    scoreText(body, query, words, 8, 2)
  );
}

/** Published articles most relevant to a question, best first. */
export function rankArticles(
  articles: Article[],
  question: string,
  lang: Language,
  limit: number
): Article[] {
  const query = String(question || '').trim().toLowerCase();
  if (!query) return [];
  const words = query.split(/\s+/).filter((w) => w.length > 2);
  return articles
    .filter((a) => a.published)
    .map((a) => ({ a, score: scoreArticle(a, query, words, lang) }))
    .filter((entry) => entry.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((entry) => entry.a);
}
