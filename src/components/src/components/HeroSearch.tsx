import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Search, X, FileText, Layers, CornerDownLeft } from 'lucide-react';
import { Article, Category, Language } from '../types';

interface HeroSearchProps {
  currentLanguage: Language;
  articles: Article[];
  categories: Category[];
  onSelectArticle: (article: Article) => void;
  onSelectCategory: (category: Category) => void;
  tagline: string;
  selectedResourceType: string;
  onSelectResourceType: (type: string) => void;
}

type Hit =
  | { kind: 'article'; id: string; title: string; subtitle: string; score: number; article: Article }
  | { kind: 'category'; id: string; title: string; subtitle: string; score: number; category: Category };

const RESOURCE_LABELS: Record<string, string> = {
  article: 'Article',
  case_study: 'Case study',
  best_practice: 'Best practice',
  toolkit: 'Toolkit',
  guide: 'Guide',
  policy: 'Policy',
};

/** Plain-text version of a markdown body, for snippets and matching. */
const flatten = (text: string) =>
  text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*_`>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** A snippet centred on the first place the query appears. */
const snippetAround = (text: string, needle: string, width = 120) => {
  const flat = flatten(text);
  if (!flat) return '';
  const at = needle ? flat.toLowerCase().indexOf(needle) : -1;
  if (at < 0) return flat.length > width ? flat.slice(0, width).trim() + '…' : flat;
  const start = Math.max(0, at - Math.floor(width / 3));
  const end = Math.min(flat.length, start + width);
  return (start > 0 ? '…' : '') + flat.slice(start, end).trim() + (end < flat.length ? '…' : '');
};

export const HeroSearch: React.FC<HeroSearchProps> = ({
  currentLanguage,
  articles,
  categories,
  onSelectArticle,
  onSelectCategory,
  tagline,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = <T,>(map: Partial<Record<Language, T>> | undefined, fallback: T): T =>
    (map && (map[currentLanguage] ?? map.en)) ?? fallback;

  const hits = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const words = q.split(/\s+/).filter(Boolean);

    const scoreText = (haystack: string, weightPhrase: number, weightWord: number) => {
      let score = 0;
      if (haystack.includes(q)) score += weightPhrase;
      words.forEach((w) => {
        if (haystack.includes(w)) score += weightWord;
      });
      return score;
    };

    const articleHits: Hit[] = articles
      .filter((a) => a.published)
      .map((a) => {
        const title = pick(a.titles, '') || a.slug;
        const body = pick(a.bodies, '');
        const tags = (a.tags || []).join(' ');
        const score =
          scoreText(title.toLowerCase(), 40, 14) +
          scoreText(tags.toLowerCase(), 16, 6) +
          scoreText(flatten(body).toLowerCase(), 8, 2);
        const label = RESOURCE_LABELS[a.resourceType] || 'Resource';
        return {
          kind: 'article' as const,
          id: a.id,
          title,
          subtitle: label + ' · ' + snippetAround(body, q),
          score,
          article: a,
        };
      })
      .filter((h) => h.score > 0);

    const categoryHits: Hit[] = categories
      .map((c) => {
        const name = pick(c.names, '') || c.slug;
        const description = pick(c.descriptions, '');
        const count = articles.filter((a) => a.published && a.categoryId === c.id).length;
        const score =
          scoreText(name.toLowerCase(), 45, 16) + scoreText(description.toLowerCase(), 10, 3);
        return {
          kind: 'category' as const,
          id: c.id,
          title: name,
          subtitle: count + (count === 1 ? ' resource' : ' resources') + (description ? ' · ' + description : ''),
          score,
          category: c,
        };
      })
      .filter((h) => h.score > 0);

    return [...categoryHits, ...articleHits].sort((a, b) => b.score - a.score).slice(0, 8);
  }, [query, articles, categories, currentLanguage]);

  // Reset the highlight whenever the result set changes, so Enter never opens
  // a stale row that has scrolled out of the list.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const choose = (hit: Hit | undefined) => {
    if (!hit) return;
    setIsOpen(false);
    setQuery('');
    if (hit.kind === 'article') onSelectArticle(hit.article);
    else onSelectCategory(hit.category);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!hits.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((i) => (i + 1) % hits.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + hits.length) % hits.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(hits[activeIndex]);
    }
  };

  const showPanel = isOpen && query.trim().length >= 2;
  const totalResources = articles.filter((a) => a.published).length;

  return (
    <div className="relative bg-gradient-to-b from-sky-50 via-blue-50/50 to-slate-50 text-slate-900 py-12 sm:py-16 px-4 sm:px-6 border-b border-slate-200">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-sky-200/50 blur-3xl pointer-events-none rounded-full"></div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 bg-sky-100/80 border border-sky-300 text-sky-950 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide mb-5 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-sky-700 animate-pulse" />
          <span>Central Knowledge, Tools &amp; Compliance Portal for Non-Profits</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-3 leading-tight">
          NGO Knowledge Hub
        </h1>
        <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto mb-6 font-normal leading-relaxed">
          {tagline}
        </p>

        {/* ---------------------------------------------------------------- */}
        {/* Search. Results appear as you type from the second character on.  */}
        {/* ---------------------------------------------------------------- */}
        <div ref={boxRef} className="relative max-w-2xl mx-auto text-left">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={showPanel}
              aria-controls="hero-search-results"
              aria-label="Search the knowledge hub"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={onKeyDown}
              placeholder={'Search ' + totalResources + ' resources — FCRA, 80G, grants, data protection…'}
              className="w-full rounded-2xl border border-slate-300 bg-white/95 pl-12 pr-11 py-3.5 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 transition"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 rounded p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {showPanel && (
            <div
              id="hero-search-results"
              role="listbox"
              className="absolute left-0 right-0 mt-2 z-30 rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.14)] overflow-hidden"
            >
              {hits.length === 0 ? (
                <div className="px-4 py-5 text-sm text-slate-600">
                  Nothing matched <span className="font-semibold text-slate-900">“{query.trim()}”</span>.
                  Try a shorter word, or ask the AI assistant at the bottom right of the page.
                </div>
              ) : (
                <>
                  <ul className="max-h-[22rem] overflow-y-auto divide-y divide-slate-100">
                    {hits.map((hit, i) => (
                      <li key={hit.kind + ':' + hit.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={i === activeIndex}
                          onMouseEnter={() => setActiveIndex(i)}
                          onClick={() => choose(hit)}
                          className={
                            'w-full text-left px-4 py-3 flex gap-3 items-start cursor-pointer transition-colors ' +
                            (i === activeIndex ? 'bg-sky-50' : 'bg-white hover:bg-slate-50')
                          }
                        >
                          <span
                            className={
                              'mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ' +
                              (hit.kind === 'category' ? 'bg-indigo-50 text-indigo-600' : 'bg-sky-50 text-sky-700')
                            }
                          >
                            {hit.kind === 'category' ? (
                              <Layers className="w-4 h-4" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-slate-900 truncate">
                              {hit.title}
                            </span>
                            <span className="block text-xs text-slate-500 leading-relaxed line-clamp-2">
                              {hit.subtitle}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500">
                    <CornerDownLeft className="w-3 h-3" />
                    <span>Enter to open · ↑ ↓ to move · Esc to close</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
