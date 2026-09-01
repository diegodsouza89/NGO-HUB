import { Category, Article } from '../types';
import { buildContentJson } from './exportContent';

/**
 * Publishing straight from the admin portal to every visitor.
 *
 * Until now the only route was: press Download, find content.json, upload it
 * to the right folder on GitHub, wait for a rebuild. That went wrong three
 * times in one afternoon — once to the repository root, once as
 * "content 3 lang.json", once as "content (1).json" — because a browser
 * renames a download when one of that name already exists, and a drag-and-drop
 * upload keeps whatever the local filename happens to be.
 *
 * The payload is built by the same buildContentJson used for the download, so
 * what gets published and what gets exported can never drift apart.
 */

const KEY_STORAGE = 'ngo_content_admin_key';

/** The publish key lives in this browser only; it is never put in the repo. */
export function getPublishKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setPublishKey(key: string): void {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* a browser that refuses storage just means retyping the key next time */
  }
}

export interface PublishResult {
  ok: boolean;
  /** Something an admin can act on, not a stack trace. */
  message: string;
  publishedAt?: string;
  categories?: number;
  articles?: number;
}

export interface PublishedState {
  available: boolean;
  published: boolean;
  publishedAt?: string;
  categories?: number;
  articles?: number;
}

/** What is live right now, for the panel to show before anyone presses anything. */
export async function fetchPublishedState(): Promise<PublishedState> {
  try {
    const res = await fetch('/api/content', { headers: { Accept: 'application/json' } });
    if (!res.ok) return { available: false, published: false };
    const data = await res.json();
    return {
      available: true,
      published: data && data.published === true,
      publishedAt: data && data.publishedAt,
      categories: data && Array.isArray(data.categories) ? data.categories.length : undefined,
      articles: data && Array.isArray(data.articles) ? data.articles.length : undefined,
    };
  } catch {
    return { available: false, published: false };
  }
}

export async function publishContent(
  categories: Category[],
  articles: Article[],
  key: string,
  note?: string
): Promise<PublishResult> {
  if (!key.trim()) {
    return { ok: false, message: 'Enter the publish key first.' };
  }

  // Exactly the payload the Download button produces, so published and
  // exported content can never drift apart. buildContentJson returns the file
  // as text, so it is parsed back to reuse its normalisation and ordering.
  let content: { categories: unknown[]; articles: unknown[] };
  try {
    content = JSON.parse(buildContentJson(categories, articles));
  } catch (err) {
    return { ok: false, message: 'Could not build the content to publish. Nothing was changed.' };
  }

  let res: Response;
  try {
    res = await fetch('/api/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key.trim() },
      body: JSON.stringify({
        categories: content.categories,
        articles: content.articles,
        note: note || undefined,
      }),
    });
  } catch (err) {
    return {
      ok: false,
      message:
        'Could not reach the site to publish. Check your connection and try again — nothing was changed.',
    };
  }

  let data: Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {
    /* fall through to the status-based messages below */
  }

  if (res.status === 401) {
    return { ok: false, message: String(data.error || 'That publish key was not accepted.') };
  }
  if (res.status === 503) {
    return {
      ok: false,
      message:
        String(data.error || 'Publishing is not set up on the server yet.') +
        ' Use Download content.json until it is.',
    };
  }
  if (!res.ok) {
    return { ok: false, message: String(data.error || 'Publish failed (' + res.status + ').') };
  }

  return {
    ok: true,
    message: 'Published. Visitors will see this within a minute.',
    publishedAt: typeof data.publishedAt === 'string' ? data.publishedAt : undefined,
    categories: typeof data.categories === 'number' ? data.categories : undefined,
    articles: typeof data.articles === 'number' ? data.articles : undefined,
  };
}
