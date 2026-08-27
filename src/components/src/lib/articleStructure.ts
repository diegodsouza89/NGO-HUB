/**
 * Turns an article body into a structure the reading view can lay out.
 *
 * The 22 articles in this Hub were written in a word processor and pasted in.
 * They contain no markdown headings, no markdown links and no HTML. What they
 * DO contain is a consistent set of typographic conventions:
 *
 *   "Step 3: Create Your Account"   a numbered stage of a process
 *   "•\tRegistration certificate"   a bullet
 *   "•\t☐ Collect PAN card"         a checklist item
 *   "📌 India tip"                  a callout, its body on the lines below
 *   "1.\tCheck your eligibility"    a numbered list
 *   "Sources"                       the reference block at the end
 *
 * This parser reads those conventions so the reading view can show steps,
 * callouts and checklists as real interface, without anybody having to go
 * back and rewrite 22 articles in markdown.
 *
 * Anything it does not recognise stays a paragraph, and an article with too
 * little structure to lay out is reported with rich === false so the caller
 * can fall back to plain prose. Nothing is ever dropped: every input line
 * ends up in exactly one block.
 */

export type Block =
  | { kind: 'para'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'numbers'; items: string[] }
  | { kind: 'checklist'; items: string[] }
  | { kind: 'callout'; title: string; body: string[] }
  | { kind: 'table'; header: string[]; rows: string[][] }
  | { kind: 'rule' };

export interface Step {
  n: number;
  /** The heading as written, e.g. "Check Your Eligibility". */
  title: string;
  blocks: Block[];
}

export interface ArticleStructure {
  /** True when there is enough structure for the step-based layout. */
  rich: boolean;
  subtitle: string;
  /** A standfirst line such as "Prepared for NGOs | August 2026". */
  metaLine: string;
  intro: Block[];
  steps: Step[];
  /** Everything after the last step and before Sources. */
  outro: Block[];
  /** How many checklist boxes the body contains, for the sidebar card. */
  checklistCount: number;
  /** Lines under a "Sources" heading. */
  sources: string[];
  /** Trailing notes that followed the sources. */
  sourceNotes: string[];
}

const STEP_RE = /^step\s+(\d+)\s*[:.–-]\s*(.+)$/i;
/**
 * A bullet line.
 *
 * The English articles were pasted out of a word processor and use "•" with a
 * tab. The eight translated articles were produced later and use markdown
 * "* " and "- " instead, so both have to be recognised or the translations
 * lose every list. The required whitespace after * is what stops a line that
 * opens with **bold** from being read as a bullet.
 */
const BULLET_RE = /^(?:[•·▪●]\s*\t?\s*|[-*]\s+)(.+)$/;
const NUMBER_RE = /^(\d{1,2})[.)]\s*\t?\s*(.+)$/;
const CALLOUT_RE = /^📌\s*(.*)$/;
const BOX_RE = /^[☐☑☒✅]\s*(.*)$/;
const SOURCES_RE = /^(sources?|references?|useful links?|further reading)\s*:?\s*$/i;
const RULE_RE = /^[-_=—]{3,}$/;
const MD_HEADING_RE = /^(#{1,4})\s+(.+)$/;

/**
 * Seven of the guides contain tables that were pasted out of a word processor
 * as tab-separated lines, e.g.
 *   "Priority\tAction\tWhy It Matters Most"
 * The previous renderer printed each of those as a paragraph, where the tabs
 * collapsed to single spaces and the columns ran into one sentence. Reading
 * them back as real rows is what lets the view lay them out as a table.
 */
function tableCells(line: string): string[] | null {
  if ((line.match(/\t/g) || []).length < 2) return null;
  const cells = line.split('\t').map(c => c.trim());
  const filled = cells.filter(Boolean);
  return filled.length >= 3 ? filled : null;
}

/** A short, punctuation-free row is a column heading rather than data. */
function looksLikeTableHeader(cells: string[]): boolean {
  return cells.every(c => c.length <= 34 && !/[.;]\s/.test(c) && !/^\d/.test(c));
}

/*
 * There is deliberately no "short label" helper here.
 *
 * An earlier draft derived a one-word label for each step so the tracker could
 * read "Eligibility · Documents · Account". Run over the real articles it also
 * produced "Explicitly", "Healthy", "Need" and "Down" — because a heading like
 * "Protect the Time Explicitly" has no short noun to find. The tracker shows
 * numbers and names the open step in full underneath instead, which is correct
 * for every article rather than most of them.
 */

/**
 * A line that reads as a section heading.
 *
 * These bodies have no "## " markers, so this leans on layout instead: a short
 * line, sitting on its own after a blank line, that does not end like a
 * sentence. Requiring the blank line above is what keeps ordinary short
 * sentences inside a paragraph from being promoted.
 */
function looksLikeHeading(line: string, prevBlank: boolean, nextNonEmpty: boolean): boolean {
  if (!prevBlank || !nextNonEmpty) return false;
  const t = line.trim();
  if (t.length < 3 || t.length > 80) return false;
  if (/[.,;!]$/.test(t)) return false;
  if (!/^[A-Z0-9“"]/.test(t)) return false;
  if (t.split(/\s+/).length > 12) return false;
  // A line that is mostly lower case is prose, not a heading.
  const letters = t.replace(/[^A-Za-z]/g, '');
  if (!letters) return false;
  const upper = (t.match(/[A-Z]/g) || []).length;
  if (upper / letters.length < 0.08 && !/[?:]$/.test(t)) return false;
  return true;
}

function pushBlock(target: Block[], block: Block | null) {
  if (block) target.push(block);
}

export function parseArticle(body: string, articleTitle?: string): ArticleStructure {
  const raw = String(body || '').replace(/\r\n?/g, '\n');
  const lines = raw.split('\n');

  const norm = (s: string) => s.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const titleKey = norm(articleTitle || '');

  const intro: Block[] = [];
  const steps: Step[] = [];
  const outro: Block[] = [];
  const sources: string[] = [];
  const sourceNotes: string[] = [];
  let checklistCount = 0;

  let subtitle = '';
  let metaLine = '';
  let current: Block[] = intro;
  let currentStep: Step | null = null;
  let open: Block | null = null;
  let inSources = false;
  let seenBody = false;

  /** Where a block belongs right now: inside the open step, or the section. */
  const target = () => (currentStep ? currentStep.blocks : current);

  /**
   * Close the block being accumulated.
   *
   * This has to write to target(), not to the section list. An earlier version
   * flushed into `current`, which meant every paragraph and bullet inside a
   * step was filed under the intro instead: the text was all still on the page,
   * so a "nothing was lost" check passed, while the steps themselves rendered
   * empty.
   */
  const flush = () => {
    pushBlock(target(), open);
    open = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    const prevBlank = i === 0 || !lines[i - 1].trim();
    let nextNonEmpty = false;
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim()) { nextNonEmpty = true; break; }
    }

    if (!line) { flush(); continue; }

    // The body usually opens by repeating the article title. The reading view
    // already shows the title, so printing it again reads as a mistake.
    if (!seenBody && titleKey && norm(line) === titleKey) continue;

    // "Prepared for NGOs  |  August 2026" and similar standfirst metadata.
    // It is shown as a small line under the title rather than dropped, so no
    // wording the author typed disappears without them deciding it should.
    if (!seenBody && !metaLine && /^\*{0,2}prepared\s+for\b/i.test(line)) {
      metaLine = line.replace(/^\*\*(.*)\*\*$/, '$1').trim();
      continue;
    }

    if (SOURCES_RE.test(line)) {
      flush();
      currentStep = null;
      current = outro;
      inSources = true;
      continue;
    }

    if (inSources) {
      // Once the sources are listed, a paragraph-length line is a closing note.
      if (/^note\b/i.test(line) || line.length > 130) sourceNotes.push(line);
      else sources.push(line);
      continue;
    }

    const stepMatch = line.match(STEP_RE);
    if (stepMatch) {
      flush();
      seenBody = true;
      const title = stepMatch[2].trim();
      currentStep = { n: Number(stepMatch[1]), title, blocks: [] };
      steps.push(currentStep);
      continue;
    }

    const calloutMatch = line.match(CALLOUT_RE);
    if (calloutMatch) {
      flush();
      seenBody = true;
      const heading = calloutMatch[1].trim();
      const callout: Block = { kind: 'callout', title: heading || 'Note', body: [] };
      // The callout body is every following line up to the next blank one.
      let j = i + 1;
      while (j < lines.length && lines[j].trim()) {
        const inner = lines[j].trim();
        if (STEP_RE.test(inner) || CALLOUT_RE.test(inner) || SOURCES_RE.test(inner)) break;
        const innerBullet = inner.match(BULLET_RE);
        callout.body.push(innerBullet ? innerBullet[1].trim() : inner);
        j++;
      }
      i = j - 1;
      if (!heading && callout.body.length) {
        callout.title = 'Note';
      }
      pushBlock(target(), callout);
      continue;
    }

    const mdHeading = line.match(MD_HEADING_RE);
    if (mdHeading) {
      flush();
      seenBody = true;
      pushBlock(target(), { kind: 'heading', text: mdHeading[2].trim() });
      continue;
    }

    if (RULE_RE.test(line)) {
      flush();
      pushBlock(target(), { kind: 'rule' });
      continue;
    }

    const bulletMatch = line.match(BULLET_RE);
    if (bulletMatch) {
      seenBody = true;
      const inner = bulletMatch[1].trim();
      const boxed = inner.match(BOX_RE);
      const wanted = boxed ? 'checklist' : 'bullets';
      const text = (boxed ? boxed[1] : inner).trim();
      if (!open || open.kind !== wanted) {
        flush();
        open = boxed ? { kind: 'checklist', items: [] } : { kind: 'bullets', items: [] };
      }
      (open as { items: string[] }).items.push(text);
      continue;
    }

    const boxOnly = line.match(BOX_RE);
    if (boxOnly) {
      seenBody = true;
      if (!open || open.kind !== 'checklist') {
        flush();
        open = { kind: 'checklist', items: [] };
      }
      (open as { items: string[] }).items.push(boxOnly[1].trim());
      continue;
    }

    const cells = tableCells(line);
    if (cells) {
      seenBody = true;
      const isHeader = looksLikeTableHeader(cells);
      const openTable = open && open.kind === 'table' ? open : null;
      // A second heading row means a second table, not more of the first one.
      if (!openTable || (isHeader && openTable.rows.length > 0)) {
        flush();
        open = isHeader
          ? { kind: 'table', header: cells, rows: [] }
          : { kind: 'table', header: [], rows: [cells] };
      } else {
        openTable.rows.push(cells);
      }
      continue;
    }

    const numberMatch = line.match(NUMBER_RE);
    if (numberMatch) {
      seenBody = true;
      if (!open || open.kind !== 'numbers') {
        flush();
        open = { kind: 'numbers', items: [] };
      }
      (open as { items: string[] }).items.push(numberMatch[2].trim());
      continue;
    }

    if (looksLikeHeading(line, prevBlank, nextNonEmpty)) {
      flush();
      // The first heading-shaped line, before any real content, is the
      // article's standfirst rather than a section of it.
      if (!seenBody && !subtitle && !currentStep) {
        subtitle = line;
        continue;
      }
      seenBody = true;
      pushBlock(target(), { kind: 'heading', text: line });
      continue;
    }

    seenBody = true;
    // One line, one paragraph. These bodies put a whole paragraph on a single
    // line, so joining consecutive lines would run separate points together —
    // it turned the rows of a pasted table into one unreadable sentence.
    flush();
    open = { kind: 'para', text: line };
  }
  flush();

  /**
   * Move the closing checklist out of whichever step it happened to fall into.
   *
   * In all 20 guides that have one, the tick-box list is a summary of the whole
   * article and sits in its last quarter — but because it carries no "Step N:"
   * marker it parses as more content belonging to the final step. Left there it
   * would be hidden inside a collapsed accordion panel, and the sidebar's
   * "jump to the checklist" button would scroll to something invisible.
   */
  const promoteChecklists = (blocks: Block[]) => {
    const moved: Block[] = [];
    const drop = new Set<number>();
    blocks.forEach((b, i) => {
      if (b.kind !== 'checklist') return;
      const prev = blocks[i - 1];
      if (prev && prev.kind === 'heading' && /check\s?list/i.test(prev.text) && !drop.has(i - 1)) {
        drop.add(i - 1);
        moved.push(prev);
      }
      drop.add(i);
      moved.push(b);
    });
    if (!drop.size) return moved;
    const kept = blocks.filter((_, i) => !drop.has(i));
    blocks.length = 0;
    blocks.push(...kept);
    return moved;
  };

  const promoted: Block[] = [];
  steps.forEach(s => promoted.push(...promoteChecklists(s.blocks)));
  promoted.push(...promoteChecklists(intro));
  outro.unshift(...promoted);

  const countBoxes = (blocks: Block[]) => {
    blocks.forEach(b => {
      if (b.kind === 'checklist') checklistCount += b.items.length;
    });
  };
  countBoxes(intro);
  countBoxes(outro);
  steps.forEach(s => countBoxes(s.blocks));

  return {
    rich: steps.length >= 3,
    subtitle,
    metaLine,
    intro,
    steps,
    outro,
    checklistCount,
    sources,
    sourceNotes,
  };
}
