import { Article, Category, Language } from '../types';
import definition from '../data/assessment.json';
import { pickLang } from './search';

/**
 * Scoring for the technology self-assessment.
 *
 * The questions, wording and score bands all live in data/assessment.json so
 * they can be reworded or translated without touching code. Deliberately kept
 * out of content.json: that file's change-detection is what replaces a
 * browser's local copy, and putting the assessment beside the articles would
 * tie the two together for no benefit.
 */

export interface AssessmentOption {
  value: number;
  labels: Partial<Record<Language, string>>;
  unsure?: boolean;
}

export interface AssessmentQuestion {
  id: string;
  prompts: Partial<Record<Language, string>>;
}

export interface AssessmentArea {
  id: string;
  names: Partial<Record<Language, string>>;
  descriptions: Partial<Record<Language, string>>;
  categoryIds: string[];
  advice: Partial<Record<Language, string>>;
  questions: AssessmentQuestion[];
}

interface Band {
  max: number;
  labels: Partial<Record<Language, string>>;
  summaries?: Partial<Record<Language, string>>;
  tone: 'risk' | 'warn' | 'ok' | 'strong';
}

type LangMap = Partial<Record<Language, string>>;

interface Definition {
  version: number;
  ui?: Record<string, LangMap>;
  titles: Partial<Record<Language, string>>;
  intros: Partial<Record<Language, string>>;
  startLabels: Partial<Record<Language, string>>;
  notes: Partial<Record<Language, string>>;
  options: AssessmentOption[];
  areaBands: Band[];
  overallBands: Band[];
  areas: AssessmentArea[];
}

export const ASSESSMENT = definition as unknown as Definition;

/**
 * On-screen labels, read from assessment.json so the wording can be changed or
 * translated without touching code. `vars` fills placeholders like {count}.
 *
 * Falls back to the supplied English if a key is missing, so an incomplete
 * translation degrades to English rather than showing a blank or a key name.
 */
export function uiText(
  key: string,
  lang: Language,
  fallback: string,
  vars?: Record<string, string | number>
): string {
  const map = (ASSESSMENT.ui || {})[key];
  let out = map ? pickLang(map, lang, fallback) : fallback;
  if (vars) {
    for (const name of Object.keys(vars)) {
      out = out.split('{' + name + '}').join(String(vars[name]));
    }
  }
  return out;
}

/** Every question, flattened, in the order they are asked. */
export interface FlatQuestion extends AssessmentQuestion {
  areaId: string;
  areaIndex: number;
  indexInArea: number;
}

export function allQuestions(): FlatQuestion[] {
  const out: FlatQuestion[] = [];
  ASSESSMENT.areas.forEach((area, areaIndex) => {
    area.questions.forEach((q, indexInArea) => {
      out.push({ ...q, areaId: area.id, areaIndex, indexInArea });
    });
  });
  return out;
}

export const MAX_PER_QUESTION = ASSESSMENT.options.reduce(
  (m, o) => Math.max(m, o.value),
  0
);

export function maxScore(): number {
  return allQuestions().length * MAX_PER_QUESTION;
}

export function maxAreaScore(areaId: string): number {
  const area = ASSESSMENT.areas.find((a) => a.id === areaId);
  return (area ? area.questions.length : 0) * MAX_PER_QUESTION;
}

function bandFor(bands: Band[], score: number): Band {
  for (const band of bands) {
    if (score <= band.max) return band;
  }
  return bands[bands.length - 1];
}

export interface AreaResult {
  area: AssessmentArea;
  score: number;
  max: number;
  /** 0-1, for the bar. */
  ratio: number;
  bandLabel: string;
  tone: Band['tone'];
  /** How many of this area's answers were "not sure". */
  unsureCount: number;
  articles: Article[];
  categories: Category[];
}

export interface AssessmentResult {
  score: number;
  max: number;
  bandLabel: string;
  summary: string;
  tone: Band['tone'];
  areas: AreaResult[];
  /** Weakest areas first, only those worth acting on. */
  priorities: AreaResult[];
  answered: number;
  total: number;
  unsureCount: number;
}

/**
 * Turn answers into a result.
 *
 * `answers` maps question id to the index of the chosen option, so an "unsure"
 * answer stays distinguishable from a deliberate "not started" even though both
 * score zero.
 */
export function scoreAssessment(
  answers: Record<string, number>,
  articles: Article[],
  categories: Category[],
  lang: Language
): AssessmentResult {
  const questions = allQuestions();
  let total = 0;
  let unsureTotal = 0;

  const areas: AreaResult[] = ASSESSMENT.areas.map((area) => {
    let score = 0;
    let unsureCount = 0;
    area.questions.forEach((q) => {
      const chosen = answers[q.id];
      const option = chosen === undefined ? undefined : ASSESSMENT.options[chosen];
      if (!option) return;
      score += option.value;
      if (option.unsure) unsureCount += 1;
    });
    total += score;
    unsureTotal += unsureCount;

    const max = area.questions.length * MAX_PER_QUESTION;
    const band = bandFor(ASSESSMENT.areaBands, score);
    const areaCategories = area.categoryIds
      .map((id) => categories.find((c) => c.id === id))
      .filter((c): c is Category => Boolean(c));

    // Suggest at most two of the Hub's guides, so the result stays actionable
    // rather than becoming a reading list. Take one per mapped category before
    // taking a second from any of them - otherwise an area covering two
    // categories would only ever recommend from the first, and "Outreach &
    // digital presence" could never point at a website guide.
    const perCategory = area.categoryIds.map((id) =>
      articles.filter((a) => a.published && a.categoryId === id)
    );
    const areaArticles: Article[] = [];
    for (let round = 0; areaArticles.length < 2 && round < 4; round++) {
      for (const list of perCategory) {
        if (areaArticles.length >= 2) break;
        const next = list[round];
        if (next && !areaArticles.some((a) => a.id === next.id)) areaArticles.push(next);
      }
    }

    return {
      area,
      score,
      max,
      ratio: max > 0 ? score / max : 0,
      bandLabel: pickLang(band.labels, lang, area.id),
      tone: band.tone,
      unsureCount,
      articles: areaArticles,
      categories: areaCategories,
    };
  });

  const overall = bandFor(ASSESSMENT.overallBands, total);

  // Anything not already "Good" or better is worth naming as a priority, worst
  // first. If everything is strong the list is empty rather than padded out.
  const priorities = [...areas]
    .filter((a) => a.ratio < 0.67)
    .sort((x, y) => x.ratio - y.ratio || x.area.id.localeCompare(y.area.id))
    .slice(0, 3);

  return {
    score: total,
    max: questions.length * MAX_PER_QUESTION,
    bandLabel: pickLang(overall.labels, lang, ''),
    summary: pickLang(overall.summaries || {}, lang, ''),
    tone: overall.tone,
    areas,
    priorities,
    answered: questions.filter((q) => answers[q.id] !== undefined).length,
    total: questions.length,
    unsureCount: unsureTotal,
  };
}

export const TONE_CLASSES: Record<Band['tone'], { text: string; bg: string; bar: string; border: string }> = {
  risk: { text: 'text-rose-800', bg: 'bg-rose-50', bar: 'bg-rose-500', border: 'border-rose-200' },
  warn: { text: 'text-amber-900', bg: 'bg-amber-50', bar: 'bg-amber-500', border: 'border-amber-200' },
  ok: { text: 'text-sky-900', bg: 'bg-sky-50', bar: 'bg-sky-600', border: 'border-sky-200' },
  strong: { text: 'text-emerald-900', bg: 'bg-emerald-50', bar: 'bg-emerald-600', border: 'border-emerald-200' },
};
