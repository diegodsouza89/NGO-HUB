import React, { useMemo, useState } from 'react';
import {
  ClipboardCheck,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  FileText,
  HelpCircle,
  Check,
  Sparkles,
} from 'lucide-react';
import { Article, Category, Language } from '../types';
import {
  ASSESSMENT,
  allQuestions,
  scoreAssessment,
  uiText,
  TONE_CLASSES,
} from '../lib/assessment';
import { pickLang } from '../lib/search';

interface SelfAssessmentProps {
  articles: Article[];
  categories: Category[];
  currentLanguage: Language;
  onSelectArticle: (article: Article) => void;
  onSelectCategory: (category: Category) => void;
  onExit: () => void;
}

export const SelfAssessment: React.FC<SelfAssessmentProps> = ({
  articles,
  categories,
  currentLanguage,
  onSelectArticle,
  onSelectCategory,
  onExit,
}) => {
  const questions = useMemo(() => allQuestions(), []);
  const [stage, setStage] = useState<'intro' | 'asking' | 'results'>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const lang = currentLanguage;
  const text = (map: Record<string, string> | Partial<Record<Language, string>>, fallback = '') =>
    pickLang(map as Partial<Record<Language, string>>, lang, fallback);
  // Screen labels come from assessment.json too, so they can be reworded and
  // translated without a code change.
  const ui = (key: string, fallback: string, vars?: Record<string, string | number>) =>
    uiText(key, lang, fallback, vars);

  const result = useMemo(
    () => scoreAssessment(answers, articles, categories, lang),
    [answers, articles, categories, lang]
  );

  const current = questions[index];
  const currentArea = ASSESSMENT.areas[current ? current.areaIndex : 0];
  const answeredCurrent = current ? answers[current.id] !== undefined : false;

  const choose = (optionIndex: number) => {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: optionIndex }));
    // Move on by itself — one tap per question rather than tap-then-next.
    window.setTimeout(() => {
      if (index + 1 < questions.length) setIndex(index + 1);
      else setStage('results');
    }, 180);
  };

  const restart = () => {
    setAnswers({});
    setIndex(0);
    setStage('intro');
  };

  /* ------------------------------------------------------------------ intro */
  if (stage === 'intro') {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {ui('backToHub', 'Back to the Knowledge Hub')}
        </button>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-10">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 mb-5">
            <ClipboardCheck className="w-6 h-6" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {text(ASSESSMENT.titles, 'Where does your NGO stand on technology?')}
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-3">
            {text(ASSESSMENT.intros)}
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ASSESSMENT.areas.map((area) => (
              <div
                key={area.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3"
              >
                <div className="text-sm font-bold text-slate-900">{text(area.names, area.id)}</div>
                <div className="text-xs text-slate-500 leading-relaxed mt-0.5">
                  {text(area.descriptions)}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStage('asking')}
            className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-sky-700 hover:bg-sky-800 text-white font-semibold px-6 py-3 text-sm shadow-md transition-colors cursor-pointer"
          >
            {text(ASSESSMENT.startLabels, 'Begin self-assessment')}
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[11px] text-slate-400 leading-relaxed mt-5">{text(ASSESSMENT.notes)}</p>
        </div>
      </section>
    );
  }

  /* ---------------------------------------------------------------- asking */
  if (stage === 'asking' && current) {
    const progress = Math.round((index / questions.length) * 100);
    return (
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-sky-700 uppercase tracking-wider">
            {text(currentArea.names, currentArea.id)}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {ui('questionCount', '{current} of {total}', { current: index + 1, total: questions.length })}
          </span>
        </div>

        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-7">
          <div
            className="h-full bg-sky-600 transition-all duration-300"
            style={{ width: progress + '%' }}
          />
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
            {text(current.prompts, current.id)}
          </h2>

          <div className="mt-6 space-y-2">
            {ASSESSMENT.options.map((option, optionIndex) => {
              const selected = answers[current.id] === optionIndex;
              return (
                <button
                  key={optionIndex}
                  onClick={() => choose(optionIndex)}
                  className={
                    'w-full text-left rounded-2xl border px-4 py-3 text-sm font-medium transition-colors cursor-pointer flex items-center gap-3 ' +
                    (selected
                      ? 'border-sky-600 bg-sky-50 text-sky-900 ring-2 ring-sky-200'
                      : option.unsure
                        ? 'border-dashed border-slate-300 bg-white text-slate-500 hover:border-slate-400'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-sky-400 hover:bg-sky-50/40')
                  }
                >
                  <span
                    className={
                      'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ' +
                      (selected ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300')
                    }
                  >
                    {selected ? <Check className="w-3 h-3" /> : null}
                  </span>
                  <span>{text(option.labels, 'Option')}</span>
                  {option.unsure && <HelpCircle className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between mt-5">
          <button
            onClick={() => (index === 0 ? setStage('intro') : setIndex(index - 1))}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {ui('back', 'Back')}
          </button>

          {answeredCurrent && index + 1 < questions.length && (
            <button
              onClick={() => setIndex(index + 1)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-900 cursor-pointer"
            >
              {ui('next', 'Next')}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          {answeredCurrent && index + 1 === questions.length && (
            <button
              onClick={() => setStage('results')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              {ui('seeResults', 'See my results')}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </section>
    );
  }

  /* --------------------------------------------------------------- results */
  const tone = TONE_CLASSES[result.tone];

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <button
        onClick={onExit}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {ui('backToHub', 'Back to the Knowledge Hub')}
      </button>

      {/* Headline score */}
      <div className={'rounded-3xl border p-6 sm:p-8 ' + tone.bg + ' ' + tone.border}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              {ui('yourResult', 'Your result')}
            </div>
            <h1 className={'text-2xl sm:text-3xl font-extrabold tracking-tight ' + tone.text}>
              {result.bandLabel}
            </h1>
          </div>
          <div className="text-right">
            <div className={'text-3xl font-extrabold ' + tone.text}>
              {result.score}
              <span className="text-base font-bold text-slate-400">/{result.max}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {ui('answered', '{done} of {total} answered', { done: result.answered, total: result.total })}
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-700 leading-relaxed mt-4">{result.summary}</p>

        {result.unsureCount > 0 && (
          <p className="text-xs text-slate-600 leading-relaxed mt-3 border-t border-white/60 pt-3">
            {ui(
              'unsureNote',
              'You answered “I am not sure” {count} times. Those count as zero here, but they matter more than a plain no.',
              { count: result.unsureCount }
            )}
          </p>
        )}
      </div>

      {/* Area breakdown */}
      <h2 className="text-lg font-bold text-slate-900 mt-8 mb-3">{ui('areaByArea', 'Area by area')}</h2>
      <div className="space-y-3">
        {result.areas.map((areaResult) => {
          const t = TONE_CLASSES[areaResult.tone];
          return (
            <div
              key={areaResult.area.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="font-bold text-slate-900 text-sm">
                  {text(areaResult.area.names, areaResult.area.id)}
                </div>
                <div className="flex items-center gap-2.5">
                  <span
                    className={
                      'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ' +
                      t.bg + ' ' + t.text + ' ' + t.border
                    }
                  >
                    {areaResult.bandLabel}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {areaResult.score}/{areaResult.max}
                  </span>
                </div>
              </div>

              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-2.5">
                <div
                  className={'h-full ' + t.bar}
                  style={{ width: Math.round(areaResult.ratio * 100) + '%' }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* What to do next */}
      <h2 className="text-lg font-bold text-slate-900 mt-8 mb-1">{ui('whereToStart', 'Where to start')}</h2>
      {result.priorities.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-sm text-emerald-900 leading-relaxed">
          {ui('allGood', 'Nothing is scoring badly, so there is no single weak spot to point you at.')}
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-500 mb-3">
            {result.priorities.length === 1
              ? ui('weakestOne', 'Your weakest area, and the guides here that help with it.')
              : ui('weakestMany', 'Your {count} weakest areas, and the guides here that help with them.', {
                  count: result.priorities.length,
                })}
          </p>
          <div className="space-y-4">
            {result.priorities.map((p, rank) => (
              <div key={p.area.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">
                    {rank + 1}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {text(p.area.names, p.area.id)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  {text(p.area.advice)}
                </p>

                {p.articles.length > 0 ? (
                  <div className="space-y-1.5">
                    {p.articles.map((article) => (
                      <button
                        key={article.id}
                        onClick={() => onSelectArticle(article)}
                        className="w-full text-left rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-2 flex items-start gap-2 hover:bg-sky-100 transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 mt-0.5 text-sky-700 shrink-0" />
                        <span className="text-xs font-semibold text-slate-900 leading-snug">
                          {pickLang(article.titles, lang, article.slug)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">
                    {ui('noGuide', 'No guide covers this yet.')}
                    {p.categories.length > 0 && (
                      <>
                        {' '}
                        <button
                          onClick={() => onSelectCategory(p.categories[0])}
                          className="underline font-semibold text-sky-700 cursor-pointer"
                        >
                          {ui('browse', 'Browse {name}', {
                            name: text(p.categories[0].names, 'the category'),
                          })}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-3 mt-8">
        <button
          onClick={restart}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 text-xs font-semibold cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {ui('startAgain', 'Start again')}
        </button>
        <button
          onClick={onExit}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white px-4 py-2.5 text-xs font-semibold cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {ui('browseAll', 'Browse all guides')}
        </button>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed mt-5">
        {text(ASSESSMENT.notes)} {ui('privacy', 'Your answers stay in this browser and are not sent anywhere.')}
      </p>
    </section>
  );
};
