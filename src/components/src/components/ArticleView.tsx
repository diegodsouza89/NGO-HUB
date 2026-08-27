import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Eye,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Check,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Calendar,
  AlertCircle,
  Download,
  Bookmark,
  ListChecks,
  Layers,
  Link2,
  Lightbulb,
  Building2,
  RotateCcw
} from 'lucide-react';
import { Article, Category, Language, SUPPORTED_LANGUAGES, User as UserType } from '../types';
import {
  incrementArticleView,
  voteArticleHelpful,
  incrementResourceDownload,
  toggleBookmarkResource,
  getCurrentUser
} from '../lib/storage';
import { parseArticle, Block } from '../lib/articleStructure';

interface ArticleViewProps {
  article: Article;
  category?: Category;
  relatedArticles: Article[];
  currentLanguage: Language;
  currentUser: UserType | null;
  onBackToHome: () => void;
  onSelectCategory?: (category: Category) => void;
  onSelectArticle: (article: Article) => void;
  onOpenUserAuth: () => void;
}

/**
 * Reading progress is kept per article, per browser, in the same localStorage
 * the rest of the portal uses. Signing up for a programme like Google for
 * Nonprofits takes two to four weeks, so a reader who ticks off step 3 today
 * should still see it ticked when they come back next week.
 *
 * Every read and write is guarded: a browser in private mode, or one with site
 * data blocked, throws on access rather than returning null.
 */
function loadSet(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(v => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function saveSet(key: string, values: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(values));
  } catch {
    /* Storage unavailable. Progress is lost on reload, the page still works. */
  }
}

export const ArticleView: React.FC<ArticleViewProps> = ({
  article,
  category,
  relatedArticles,
  currentLanguage,
  currentUser,
  onBackToHome,
  onSelectCategory,
  onSelectArticle,
  onOpenUserAuth,
}) => {
  const [copied, setCopied] = useState(false);
  const [voted, setVoted] = useState<'yes' | 'no' | null>(null);
  const [helpfulCounts, setHelpfulCounts] = useState({
    yes: article.helpfulYes || 0,
    no: article.helpfulNo || 0,
  });
  const [downloadCount, setDownloadCount] = useState(article.downloadsCount || 0);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const progressKey = 'ngo_step_progress_' + article.id;
  const checksKey = 'ngo_article_checks_' + article.id;

  const [doneSteps, setDoneSteps] = useState<string[]>([]);
  const [ticked, setTicked] = useState<string[]>([]);
  const [openStep, setOpenStep] = useState<number | null>(null);
  /**
   * Collapsing the steps costs the reader the browser's own find-in-page,
   * which cannot see text that is not in the document. "Expand all" gives it
   * back, and is also what you want before printing or Ctrl+F.
   */
  const [expandAll, setExpandAll] = useState(false);
  const checklistRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    incrementArticleView(article.id, currentLanguage);
  }, [article.id, currentLanguage]);

  useEffect(() => {
    const user = getCurrentUser();
    if (user && user.savedResourceIds?.includes(article.id)) {
      setIsBookmarked(true);
    } else {
      setIsBookmarked(false);
    }
  }, [article.id, currentUser]);

  const isLanguageAvailable = Boolean(article.titles[currentLanguage] && article.bodies[currentLanguage]);
  const title = article.titles[currentLanguage] || article.titles.en || "Untitled Article";
  const body = article.bodies[currentLanguage] || article.bodies.en || "";

  const activeLangInfo = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  const wordCount = body.trim().split(/\s+/).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 180));

  const structure = useMemo(() => parseArticle(body, title), [body, title]);
  const steps = structure.steps;
  const isStepped = structure.rich;

  // Reset per-article state when the reader moves to another article, and open
  // the first step that is not already ticked off.
  useEffect(() => {
    const saved = loadSet(progressKey);
    setDoneSteps(saved);
    setTicked(loadSet(checksKey));
    const firstUndone = steps.find(s => !saved.includes(String(s.n)));
    setOpenStep(firstUndone ? firstUndone.n : steps.length ? steps[0].n : null);
    setExpandAll(false);
    setVoted(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id, currentLanguage]);

  const toggleDone = (n: number) => {
    const key = String(n);
    const next = doneSteps.includes(key) ? doneSteps.filter(v => v !== key) : [...doneSteps, key];
    setDoneSteps(next);
    saveSet(progressKey, next);
  };

  const toggleTick = (id: string) => {
    const next = ticked.includes(id) ? ticked.filter(v => v !== id) : [...ticked, id];
    setTicked(next);
    saveSet(checksKey, next);
  };

  const resetProgress = () => {
    setDoneSteps([]);
    setTicked([]);
    saveSet(progressKey, []);
    saveSet(checksKey, []);
  };

  const doneCount = steps.filter(s => doneSteps.includes(String(s.n))).length;
  const percent = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleVote = (helpful: boolean) => {
    if (voted) return;
    const res = voteArticleHelpful(article.id, helpful);
    setHelpfulCounts(res);
    setVoted(helpful ? 'yes' : 'no');
  };

  const handleDownload = () => {
    incrementResourceDownload(article.id);
    setDownloadCount(prev => prev + 1);

    const content = `# ${title}\n\nDownloaded from NGO Knowledge Hub\n\n${body}`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${article.slug || 'ngo_resource'}_Toolkit.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBookmarkToggle = () => {
    const user = getCurrentUser();
    if (!user) {
      onOpenUserAuth();
      return;
    }
    const updatedBookmarks = toggleBookmarkResource(article.id);
    setIsBookmarked(updatedBookmarks.includes(article.id));
  };

  const scrollToChecklist = () => {
    checklistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  /**
   * Only http, https and mailto may become a link.
   *
   * Article bodies can be edited in the /staff portal and arrive from
   * content.json, so this is untrusted input as far as the browser is
   * concerned. Without this check a body containing javascript:... would turn
   * into a link that runs code when a visitor clicks it.
   */
  const safeHref = (url: string): string | null => {
    const trimmed = String(url || '').trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^mailto:/i.test(trimmed)) return trimmed;
    // A bare address like www.example.org or someone@example.org.
    if (/^www\./i.test(trimmed)) return 'https://' + trimmed;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'mailto:' + trimmed;
    return null;
  };

  const linkClass =
    'text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900 hover:decoration-sky-600 break-words';

  /**
   * Emit text with bold applied, carrying the open/closed state across calls.
   *
   * The state matters because links are extracted first, so a line like
   *   A **bold [link](https://x.org) inside** it
   * arrives here as three separate pieces. Without a running state the ** that
   * opens in the first piece never meets the ** that closes in the third, and
   * both markers end up printed on the page.
   */
  const emitText = (
    text: string,
    state: { bold: boolean },
    keyPrefix: string
  ): React.ReactNode[] => {
    const out: React.ReactNode[] = [];
    text.split('**').forEach((piece, i) => {
      if (i > 0) state.bold = !state.bold;
      if (!piece) return;
      out.push(
        state.bold ? (
          <strong key={keyPrefix + 'b' + i} className="font-semibold text-slate-900">
            {piece}
          </strong>
        ) : (
          <React.Fragment key={keyPrefix + 't' + i}>{piece}</React.Fragment>
        )
      );
    });
    return out;
  };

  const wrapBold = (node: React.ReactNode, bold: boolean, key: string) =>
    bold ? (
      <strong key={key} className="font-semibold text-slate-900">
        {node}
      </strong>
    ) : (
      node
    );

  /** Bare web and email addresses become links. Trailing punctuation stays out. */
  const autoLink = (
    text: string,
    state: { bold: boolean },
    keyPrefix: string
  ): React.ReactNode[] => {
    const pattern = /(https?:\/\/[^\s<>()]+|www\.[^\s<>()]+|[^\s<>()]+@[^\s<>()]+\.[a-z]{2,})/gi;
    const out: React.ReactNode[] = [];
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      let raw = match[0];
      let trailing = '';
      const trail = raw.match(/[.,;:!?)\]}'"\u2019\u201d]+$/);
      if (trail) {
        trailing = trail[0];
        raw = raw.slice(0, -trailing.length);
      }
      const href = safeHref(raw);
      if (match.index > last) {
        out.push(...emitText(text.slice(last, match.index), state, keyPrefix + 'p' + match.index));
      }
      if (href) {
        out.push(
          wrapBold(
            <a
              key={keyPrefix + 'a' + match.index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              {raw}
            </a>,
            state.bold,
            keyPrefix + 'w' + match.index
          )
        );
      } else {
        out.push(...emitText(raw, state, keyPrefix + 'r' + match.index));
      }
      if (trailing) out.push(...emitText(trailing, state, keyPrefix + 'q' + match.index));
      last = match.index + match[0].length;
    }
    if (last < text.length) out.push(...emitText(text.slice(last), state, keyPrefix + 'e'));
    return out;
  };

  /**
   * Inline formatting for article bodies: [text](url) links, bare addresses,
   * and **bold**.
   *
   * The old version understood only bold, so a markdown link showed on the page
   * as the literal characters [text](https://...) and a plain address was not
   * clickable at all.
   */
  const formatInlineMarkdown = (text: string) => {
    const linkPattern = /\[([^\]]+)\]\(([^)\s]+)\)/g;
    const state = { bold: false };
    const out: React.ReactNode[] = [];
    let last = 0;
    let match: RegExpExecArray | null;

    while ((match = linkPattern.exec(text)) !== null) {
      if (match.index > last) {
        out.push(...autoLink(text.slice(last, match.index), state, 'x' + match.index));
      }
      const label = match[1];
      const href = safeHref(match[2]);
      if (href) {
        const inner = { bold: false };
        out.push(
          wrapBold(
            <a
              key={'l' + match.index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              {emitText(label, inner, 'li' + match.index)}
            </a>,
            state.bold,
            'lw' + match.index
          )
        );
      } else {
        // Not a scheme we will link to. Show the label as text rather than
        // leaving brackets and a payload on the page.
        out.push(...emitText(label, state, 'u' + match.index));
      }
      last = match.index + match[0].length;
    }

    if (last < text.length) out.push(...autoLink(text.slice(last), state, 'end'));
    return out;
  };


  /**
   * Renders one parsed block.
   *
   * Everything here is presentation only. The decision about what a line IS
   * happens once, in parseArticle, so the reading view and any future export
   * cannot disagree about where a step starts.
   */
  const renderBlock = (block: Block, key: string) => {
    switch (block.kind) {
      case 'heading':
        return (
          <h3 key={key} className="flex items-start gap-2.5 text-base sm:text-lg font-bold text-slate-900 mt-7 mb-3 first:mt-0">
            <span className="w-1 h-5 rounded-full bg-sky-500 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{formatInlineMarkdown(block.text)}</span>
          </h3>
        );

      case 'para':
        return (
          <p key={key} className="text-slate-700 text-[15px] leading-7 mb-4">
            {formatInlineMarkdown(block.text)}
          </p>
        );

      case 'bullets':
        return (
          <ul key={key} className="space-y-2 mb-5">
            {block.items.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-700 text-[15px] leading-7">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0 mt-2.5" aria-hidden="true" />
                <span>{formatInlineMarkdown(item)}</span>
              </li>
            ))}
          </ul>
        );

      case 'numbers':
        return (
          <ol key={key} className="space-y-2.5 mb-5">
            {block.items.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-700 text-[15px] leading-7">
                <span className="w-6 h-6 rounded-lg bg-sky-50 border border-sky-100 text-sky-800 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span>{formatInlineMarkdown(item)}</span>
              </li>
            ))}
          </ol>
        );

      case 'callout':
        return (
          <aside key={key} className="my-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5 flex items-start gap-3">
            <span className="w-8 h-8 rounded-xl bg-amber-400/90 text-white flex items-center justify-center shrink-0">
              <Lightbulb className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-900 mb-1">{formatInlineMarkdown(block.title)}</p>
              {block.body.map((line, i) => (
                <p key={i} className="text-[14px] leading-6 text-amber-900/90 mb-1 last:mb-0">
                  {formatInlineMarkdown(line)}
                </p>
              ))}
            </div>
          </aside>
        );

      case 'checklist':
        return (
          <div
            key={key}
            ref={checklistRef}
            className="my-6 rounded-2xl border border-slate-200 bg-slate-50/70 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-slate-200 bg-white">
              <ListChecks className="w-4 h-4 text-sky-700" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Checklist
              </span>
              <span className="text-xs text-slate-500 ml-auto">
                {block.items.filter(it => ticked.includes(it)).length} of {block.items.length} done
              </span>
            </div>
            <ul className="divide-y divide-slate-200">
              {block.items.map((item, i) => {
                const on = ticked.includes(item);
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => toggleTick(item)}
                      aria-pressed={on}
                      className="w-full flex items-start gap-3 text-left px-4 sm:px-5 py-3 hover:bg-white transition-colors cursor-pointer"
                    >
                      <span
                        className={`w-[18px] h-[18px] rounded-md border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                          on ? 'bg-sky-600 border-sky-600' : 'bg-white border-slate-300'
                        }`}
                      >
                        {on && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </span>
                      <span
                        className={`text-[14.5px] leading-6 ${
                          on ? 'text-slate-400 line-through' : 'text-slate-700'
                        }`}
                      >
                        {formatInlineMarkdown(item)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );

      case 'table':
        return (
          <div key={key} className="my-6 -mx-1 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left border-collapse">
              {block.header.length > 0 && (
                <thead>
                  <tr>
                    {block.header.map((cell, i) => (
                      <th
                        key={i}
                        scope="col"
                        className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border-b-2 border-slate-200 px-3 py-2.5 align-bottom"
                      >
                        {formatInlineMarkdown(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r} className="align-top even:bg-slate-50/60">
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={`px-3 py-2.5 border-b border-slate-100 text-[14px] leading-6 ${
                          ci === 0 ? 'font-semibold text-slate-900' : 'text-slate-700'
                        }`}
                      >
                        {formatInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'rule':
        return <hr key={key} className="my-7 border-slate-200" />;

      default:
        return null;
    }
  };

  const renderBlocks = (blocks: Block[], prefix: string) =>
    blocks.map((b, i) => renderBlock(b, prefix + i));

  /**
   * Fallback for an article with no detectable structure. One of the 22 guides
   * is a short index page with no steps, headings or bullets at all, and the
   * translated bodies use markdown rather than the "Step N:" convention.
   */
  const proseBody = () => (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-9 shadow-xs">
      {renderBlocks(structure.intro, 'i')}
      {structure.steps.map(step => (
        <section key={step.n} className="mt-8">
          <h3 className="flex items-center gap-3 text-base sm:text-lg font-bold text-slate-900 mb-3">
            <span className="w-7 h-7 rounded-xl bg-sky-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
              {step.n}
            </span>
            <span>{formatInlineMarkdown(step.title)}</span>
          </h3>
          {renderBlocks(step.blocks, 's' + step.n + '-')}
        </section>
      ))}
      {renderBlocks(structure.outro, 'o')}
    </div>
  );

  const summaryTiles: { label: string; value: string }[] = [];
  if (isStepped) {
    summaryTiles.push({ label: 'The process', value: steps.length + ' steps' });
  } else {
    const sections = structure.intro.filter(b => b.kind === 'heading').length;
    if (sections >= 2) summaryTiles.push({ label: 'Sections', value: String(sections) });
  }
  summaryTiles.push({ label: 'Reading time', value: '~' + readingTime + ' min' });
  if (structure.checklistCount) {
    summaryTiles.push({ label: 'Checklist', value: structure.checklistCount + ' items' });
  } else if (article.updatedAt) {
    summaryTiles.push({ label: 'Last updated', value: article.updatedAt });
  }

  const openStepInfo = steps.find(s => s.n === openStep) || null;

  return (
    <article className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Navigation Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 mb-5">
        <button
          onClick={onBackToHome}
          className="hover:text-sky-800 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Knowledge Hub</span>
        </button>
        {category && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <button
              onClick={() => onSelectCategory && onSelectCategory(category)}
              className="hover:text-sky-800 cursor-pointer transition-colors"
            >
              {category.names[currentLanguage] || category.names.en}
            </button>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-sky-900 font-bold truncate max-w-xs">{title}</span>
      </nav>

      {/* Language Warning Banner */}
      {!isLanguageAvailable && currentLanguage !== 'en' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 mb-6 flex items-start gap-3 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">
              Translation Pending for {activeLangInfo.nativeName} ({activeLangInfo.name})
            </p>
            <p className="text-amber-700 mt-0.5">
              This resource is currently displayed in English.
            </p>
          </div>
        </div>
      )}

      {/* Title block */}
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-sky-100 text-sky-900">
            {article.resourceType ? article.resourceType.replace('_', ' ') : 'Article'}
          </span>
          {category && (
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-sky-700" />
              {category.names[currentLanguage] || category.names.en}
            </span>
          )}
          {article.sector && (
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-500" /> {article.sector}
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 leading-tight">
          {title}
        </h1>

        {structure.subtitle && (
          <p className="text-slate-600 text-sm sm:text-base mt-3 max-w-3xl leading-relaxed">
            {formatInlineMarkdown(structure.subtitle)}
          </p>
        )}

        {structure.metaLine && (
          <p className="text-xs text-slate-400 mt-1.5">{formatInlineMarkdown(structure.metaLine)}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-sky-700" />
            <strong className="text-slate-700">{(article.views || 0) + 1}</strong> views
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            ~{readingTime} min read
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Updated {article.updatedAt || 'Recently'}
          </span>
          <span className="ml-auto flex items-center gap-2">
            <button
              onClick={handleBookmarkToggle}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-600 text-amber-600' : ''}`} />
              <span>{isBookmarked ? 'Saved' : 'Save'}</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-sky-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Share'}</span>
            </button>
          </span>
        </div>
      </header>

      {/* Summary strip */}
      {summaryTiles.length > 0 && (
        <div data-testid="summary-strip" className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-slate-200 rounded-2xl overflow-hidden border border-slate-200 mb-6">
          {summaryTiles.map(tile => (
            <div
              key={tile.label}
              className="bg-white px-4 py-3.5 [&:last-child:nth-child(odd)]:col-span-2 sm:[&:last-child:nth-child(odd)]:col-span-1"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {tile.label}
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                {tile.value}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
        {/* Main column */}
        <div className="min-w-0">
          {isStepped ? (
            <>
              {/* Step tracker. Numbers only: a step called "Protect the Time
                  Explicitly" has no honest one-word label, so the open step is
                  named in full underneath instead. */}
              <nav
                aria-label="Steps in this guide"
                className="bg-white rounded-2xl border border-slate-200 p-3 mb-5 shadow-xs"
              >
                <ol className="flex items-center gap-1.5">
                  {steps.map((step, i) => {
                    const isDone = doneSteps.includes(String(step.n));
                    const isOpen = !expandAll && openStep === step.n;
                    return (
                      <React.Fragment key={step.n}>
                        {i > 0 && <li aria-hidden="true" className="flex-1 h-0.5 bg-slate-200 rounded-full" />}
                        <li>
                          <button
                            type="button"
                            onClick={() => { setExpandAll(false); setOpenStep(isOpen ? null : step.n); }}
                            aria-label={'Step ' + step.n + ': ' + step.title}
                            aria-current={isOpen ? 'step' : undefined}
                            className={`w-9 h-9 rounded-xl text-sm font-bold flex items-center justify-center transition-all cursor-pointer border ${
                              isOpen
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                : isDone
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-sky-400 hover:text-sky-800'
                            }`}
                          >
                            {isDone && !isOpen ? <Check className="w-4 h-4" strokeWidth={3} /> : step.n}
                          </button>
                        </li>
                      </React.Fragment>
                    );
                  })}
                </ol>
                <div className="flex items-start justify-between gap-3 mt-2.5 px-1">
                  <p className="text-xs text-slate-500 min-w-0">
                    {expandAll ? (
                      <span className="font-semibold text-slate-700">
                        Showing all {steps.length} steps
                      </span>
                    ) : openStepInfo ? (
                      <>
                        <span className="font-semibold text-slate-700">
                          Step {openStepInfo.n} of {steps.length}
                        </span>
                        {' \u00b7 '}
                        {openStepInfo.title}
                      </>
                    ) : (
                      <>All steps collapsed. Pick a number to open one.</>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setExpandAll(!expandAll); if (!expandAll) setOpenStep(null); }}
                    className="text-xs font-semibold text-sky-700 hover:text-sky-900 shrink-0 cursor-pointer underline decoration-sky-200 underline-offset-2"
                  >
                    {expandAll ? 'Collapse all' : 'Expand all'}
                  </button>
                </div>
              </nav>

              {/* Anything before the first step: what the programme is, who it
                  is for, the journey overview. */}
              {structure.intro.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs mb-5">
                  {renderBlocks(structure.intro, 'i')}
                </div>
              )}

              {/* Steps as an accordion, so a six-step guide fits on one screen */}
              <div className="space-y-2.5 mb-5">
                {steps.map(step => {
                  const isOpen = expandAll || openStep === step.n;
                  const isDone = doneSteps.includes(String(step.n));
                  return (
                    <section
                      key={step.n}
                      className={`bg-white rounded-2xl border shadow-xs overflow-hidden transition-colors ${
                        isOpen ? 'border-sky-300' : 'border-slate-200'
                      }`}
                    >
                      <h2>
                        <button
                          type="button"
                          onClick={() => { setExpandAll(false); setOpenStep(isOpen && !expandAll ? null : step.n); }}
                          aria-expanded={isOpen}
                          className="w-full flex items-center gap-3.5 text-left px-4 sm:px-6 py-4 hover:bg-slate-50/70 transition-colors cursor-pointer"
                        >
                          <span
                            className={`w-8 h-8 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 ${
                              isDone
                                ? 'bg-emerald-100 text-emerald-800'
                                : isOpen
                                ? 'bg-slate-900 text-white'
                                : 'bg-sky-50 text-sky-800'
                            }`}
                          >
                            {isDone ? <Check className="w-4 h-4" strokeWidth={3} /> : step.n}
                          </span>
                          <span className="flex-1 min-w-0 text-[15px] sm:text-base font-bold text-slate-900">
                            {formatInlineMarkdown(step.title)}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </h2>

                      {isOpen && (
                        <div className="px-4 sm:px-6 pb-5 pt-1 border-t border-slate-100">
                          <div className="pt-4">{renderBlocks(step.blocks, 's' + step.n + '-')}</div>
                          <button
                            type="button"
                            onClick={() => toggleDone(step.n)}
                            aria-label={(isDone ? 'Unmark' : 'Mark') + ' step ' + step.n + ' as done'}
                            className={`mt-2 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                              isDone
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-white text-slate-700 border-slate-300 hover:border-sky-500 hover:text-sky-800'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" strokeWidth={3} />
                            {isDone ? 'Done' : 'Mark this step done'}
                          </button>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>

              {structure.outro.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs mb-5">
                  {renderBlocks(structure.outro, 'o')}
                </div>
              )}
            </>
          ) : (
            <div className="mb-5">{proseBody()}</div>
          )}

          {/* Sources */}
          {(structure.sources.length > 0 || structure.sourceNotes.length > 0) && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs mb-5">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
                <Link2 className="w-4 h-4 text-sky-700" />
                Sources
              </h2>
              <ul className="space-y-1.5 mb-4 last:mb-0">
                {structure.sources.map((src, i) => (
                  <li key={i} className="text-[14.5px] leading-6 text-slate-700 flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 mt-2.5" aria-hidden="true" />
                    <span>{formatInlineMarkdown(src)}</span>
                  </li>
                ))}
              </ul>
              {structure.sourceNotes.map((note, i) => (
                <p key={i} className="text-xs leading-6 text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  {formatInlineMarkdown(note)}
                </p>
              ))}
            </div>
          )}

          {/* Helpful vote */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">
                Was this knowledge resource helpful for your NGO?
              </h4>
              <p className="text-slate-500 text-xs">
                Your feedback helps us keep these technology guides accurate and useful.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => handleVote(true)}
                disabled={voted !== null}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  voted === 'yes'
                    ? 'bg-sky-700 text-white'
                    : 'bg-white border border-slate-300 text-slate-700 hover:border-sky-500 hover:bg-sky-50'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Yes ({helpfulCounts.yes})</span>
              </button>
              <button
                onClick={() => handleVote(false)}
                disabled={voted !== null}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  voted === 'no'
                    ? 'bg-rose-700 text-white'
                    : 'bg-white border border-slate-300 text-slate-700 hover:border-rose-500 hover:bg-rose-50'
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
                <span>No ({helpfulCounts.no})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside aria-label="Guide tools" className="lg:sticky lg:top-6 space-y-3.5">
          {isStepped && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Your progress
                </span>
                {(doneCount > 0 || ticked.length > 0) && (
                  <button
                    type="button"
                    onClick={resetProgress}
                    className="text-[10px] font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-2">
                <div
                  className="h-full bg-sky-600 rounded-full transition-all"
                  style={{ width: percent + '%' }}
                />
              </div>
              <p className="text-xs text-slate-600 font-medium">
                {doneCount} of {steps.length} steps done
              </p>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-5">
                Saved in this browser, so you can come back mid-application.
              </p>
            </div>
          )}

          {structure.checklistCount > 0 && (
            <button
              type="button"
              onClick={scrollToChecklist}
              className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-sky-400 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-1">
                <ListChecks className="w-4 h-4 text-sky-700" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Checklist
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900 group-hover:text-sky-900">
                {structure.checklistCount} things to tick off
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {ticked.length} ticked · jump to the list
              </p>
            </button>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Take it with you
            </div>
            <button
              onClick={handleDownload}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-sky-200" />
              Download this guide
            </button>
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              {article.fileType || 'Text file'} · {downloadCount} downloads
            </p>
          </div>

          {relatedArticles.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-2.5">
                <Layers className="w-4 h-4 text-sky-700" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Related guides
                </span>
              </div>
              <ul className="divide-y divide-slate-100">
                {relatedArticles.slice(0, 5).map(rel => (
                  <li key={rel.id}>
                    <button
                      type="button"
                      onClick={() => onSelectArticle(rel)}
                      className="w-full text-left py-2.5 flex items-start gap-2 group cursor-pointer"
                    >
                      <span className="flex-1 text-[13.5px] leading-5 font-medium text-sky-800 group-hover:text-sky-950 group-hover:underline decoration-sky-300 underline-offset-2">
                        {rel.titles[currentLanguage] || rel.titles.en || 'Untitled'}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5 group-hover:text-sky-700 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </article>
  );
};
