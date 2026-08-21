import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  X,
  Lightbulb,
  MessageSquareText,
  Loader2,
  FileText,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Article, Language } from '../types';
import { flattenMarkdown, pickLang, rankArticles } from '../lib/search';

interface AskAiProps {
  articles: Article[];
  currentLanguage: Language;
  onSelectArticle: (article: Article) => void;
}

interface AskResponse {
  answer?: string;
  fromHub?: boolean;
  sourceIds?: string[];
  engine?: string;
  error?: string;
}

const SAMPLE_QUESTIONS = [
  'How do I write a grant proposal?',
  'What are the FCRA compliance rules?',
  'Which free software can an NGO use?',
];

/** How many articles to send as context, and how much of each. */
const CONTEXT_ARTICLES = 5;
const CONTEXT_CHARS = 2400;

export const AskAi: React.FC<AskAiProps> = ({ articles, currentLanguage, onSelectArticle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [fromHub, setFromHub] = useState(false);
  const [sources, setSources] = useState<Article[]>([]);
  const [related, setRelated] = useState<Article[]>([]);
  const [error, setError] = useState('');
  const inFlight = useRef<AbortController | null>(null);

  // Drop any request still running when the widget closes or unmounts, so a
  // late reply cannot overwrite the panel after the visitor has moved on.
  useEffect(() => () => inFlight.current?.abort(), []);

  const reset = () => {
    setAnswer('');
    setSources([]);
    setRelated([]);
    setError('');
    setFromHub(false);
  };

  const ask = async (raw?: string) => {
    const text = (raw ?? question).trim();
    if (!text || isLoading) return;

    if (raw !== undefined) setQuestion(raw);
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    reset();
    setIsLoading(true);

    // Retrieval happens here in the browser: every published article is already
    // in memory, so the server never needs a copy of the content.
    const candidates = rankArticles(articles, text, currentLanguage, CONTEXT_ARTICLES);
    setRelated(candidates.slice(0, 3));

    const docs = candidates.map((a) => ({
      id: a.id,
      title: pickLang(a.titles, currentLanguage, a.slug),
      text: flattenMarkdown(pickLang(a.bodies, currentLanguage, '')).slice(0, CONTEXT_CHARS),
    }));

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, language: currentLanguage, docs }),
        signal: controller.signal,
      });

      let data: AskResponse = {};
      const bodyText = await res.text();
      try {
        data = JSON.parse(bodyText);
      } catch (e) {
        // A static host that has no function deployed answers with the HTML
        // shell, which is the classic "Unexpected token <" confusion.
        throw new Error(
          res.status === 404
            ? 'The AI endpoint is not deployed on this site yet.'
            : 'The server sent an unexpected response.'
        );
      }

      if (!res.ok || !data.answer) {
        throw new Error(data.error || 'The AI assistant could not answer that.');
      }

      setAnswer(data.answer);
      setFromHub(Boolean(data.fromHub));
      const ids = data.sourceIds || [];
      setSources(articles.filter((a) => ids.indexOf(a.id) !== -1));
    } catch (e: unknown) {
      if ((e as { name?: string })?.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      if (inFlight.current === controller) {
        inFlight.current = null;
        setIsLoading(false);
      }
    }
  };

  const openArticle = (article: Article) => {
    setIsOpen(false);
    onSelectArticle(article);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2">
        <span className="hidden sm:inline-block rounded-full bg-white/95 border border-slate-200 shadow-sm px-3 py-1.5 text-xs font-semibold text-slate-700">
          Ask AI
        </span>
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open the AI assistant"
          className="w-11 h-11 rounded-full bg-orange-500 hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200/80 border-2 border-white flex items-center justify-center text-white font-extrabold text-[10px] cursor-pointer"
        >
          AI
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[360px]">
      <div className="rounded-[20px] border border-slate-200 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.16)] overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50/80">
          <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-[9px] font-bold">
            AI
          </div>
          <div className="text-slate-800 font-semibold text-sm">Ask the Knowledge Hub</div>
          <button
            onClick={() => {
              inFlight.current?.abort();
              setIsOpen(false);
            }}
            aria-label="Close the AI assistant"
            className="ml-auto text-slate-500 hover:text-slate-800 rounded p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') ask();
              }}
              placeholder="Ask about compliance, grants, tech…"
              aria-label="Your question"
              className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-3 focus:ring-sky-100 focus:border-sky-400"
            />
          </div>

          <button
            onClick={() => ask()}
            disabled={isLoading || !question.trim()}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-700 hover:bg-sky-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-3 py-2 text-sm font-semibold transition-colors cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Reading the documents…
              </>
            ) : (
              <>
                <MessageSquareText className="w-4 h-4" />
                Ask AI
              </>
            )}
          </button>
        </div>

        <div className="px-3 pb-3 pt-3 space-y-2 max-h-[60vh] overflow-y-auto">
          {/* Idle state: suggest something to click. */}
          {!isLoading && !answer && !error && (
            <div className="rounded-xl border border-dashed border-sky-200 bg-sky-50/70 p-2.5 text-[12px] text-slate-600">
              <div className="flex items-center gap-1.5 text-sky-700 font-semibold mb-1.5">
                <Lightbulb className="w-3.5 h-3.5" />
                Try one of these
              </div>
              <div className="flex flex-col gap-1.5">
                {SAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => ask(q)}
                    className="text-left rounded-lg bg-white border border-sky-100 px-2 py-1.5 hover:border-sky-300 hover:bg-sky-50 transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {answer && (
            <>
              <div
                className={
                  'flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold border ' +
                  (fromHub
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-900')
                }
              >
                {fromHub ? (
                  <ShieldCheck className="w-3.5 h-3.5 mt-px shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
                )}
                <span className="font-medium leading-snug">
                  {fromHub
                    ? 'Answered from this Hub’s own documents.'
                    : 'General AI answer — not taken from a Hub document. Check it before acting on it.'}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-[13px] leading-relaxed text-slate-800 whitespace-pre-wrap">
                {answer}
              </div>
            </>
          )}

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-[12px] text-rose-800">
              <div className="flex items-center gap-1.5 font-semibold mb-0.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Could not get an answer
              </div>
              {error}
              {related.length > 0 && (
                <div className="mt-1 text-rose-900/80">
                  The matching documents below are still accurate — open one directly.
                </div>
              )}
            </div>
          )}

          {sources.length > 0 && (
            <div className="pt-0.5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Sources used
              </div>
              <div className="space-y-1.5">
                {sources.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => openArticle(a)}
                    className="w-full text-left rounded-xl border border-sky-200 bg-sky-50/70 px-2 py-1.5 flex items-start gap-2 hover:bg-sky-100 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 mt-0.5 text-sky-700 shrink-0" />
                    <span className="text-[12px] font-semibold text-slate-900 leading-snug">
                      {pickLang(a.titles, currentLanguage, a.slug)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Keyword matches, shown when the AI cited nothing so the visitor
              still has somewhere to go. */}
          {related.length > 0 && sources.length === 0 && !isLoading && (
            <div className="pt-0.5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Related documents
              </div>
              <div className="space-y-1.5">
                {related.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => openArticle(a)}
                    className="w-full text-left rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 flex items-start gap-2 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 mt-0.5 text-slate-500 shrink-0" />
                    <span className="text-[12px] font-semibold text-slate-800 leading-snug">
                      {pickLang(a.titles, currentLanguage, a.slug)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-slate-100 bg-slate-50/80 text-[10px] text-slate-500">
          <Sparkles className="w-3 h-3" />
          AI can make mistakes. Verify anything you rely on.
        </div>
      </div>
    </div>
  );
};
