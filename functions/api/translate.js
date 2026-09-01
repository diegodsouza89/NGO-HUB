/**
 * Cloudflare Pages Function - POST /api/translate
 *
 * Two translation engines, tried in order:
 *
 *   1. Cloudflare Workers AI - @cf/ai4bharat/indictrans2-en-indic-1B
 *      IndicTrans2 (AI4Bharat, IIT Madras) is purpose-built for English into
 *      the 22 scheduled Indic languages. No API key, no quota to run out of,
 *      billed per token at Cloudflare rates. Requires an "AI" binding on the
 *      Pages project.
 *
 *   2. Google Gemini - needs GEMINI_API_KEY, and its free tier runs out on
 *      long articles, which is why it is the fallback rather than the primary.
 *
 * IndicTrans2 is a translator, not a chat model, so it ignores instructions
 * like "keep the headings". Structure is preserved mechanically instead:
 * each line is translated on its own, markdown prefixes (###, -, 1.) are kept
 * outside the translated text, and URLs / inline code / product names are
 * swapped for placeholders and restored afterwards.
 *
 * Env:
 *   AI                 - Workers AI binding (add in Pages -> Settings -> Bindings)
 *   GEMINI_API_KEY     - optional, enables the fallback
 *   GEMINI_MODEL       - optional, overrides the first Gemini model tried
 *   TRANSLATE_PROVIDER - optional, "gemini" to try Gemini first instead
 *
 * Request  : { title, body, targetLanguage }
 * Response : { translatedTitle, translatedBody, engine }
 */

// 2-letter code -> { name for Gemini, FLORES-200 code for IndicTrans2 }
const LANGS = {
  en: { name: 'English', flores: 'eng_Latn' },
  hi: { name: 'Hindi', flores: 'hin_Deva' },
  mr: { name: 'Marathi', flores: 'mar_Deva' },
  ta: { name: 'Tamil', flores: 'tam_Taml' },
  te: { name: 'Telugu', flores: 'tel_Telu' },
  bn: { name: 'Bengali', flores: 'ben_Beng' },
  gu: { name: 'Gujarati', flores: 'guj_Gujr' },
  kn: { name: 'Kannada', flores: 'kan_Knda' },
};

const INDIC_MODEL = '@cf/ai4bharat/indictrans2-en-indic-1B';
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const GEMINI_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models';

// Keep Gemini requests small enough to fit inside free-tier per-minute limits.
const CHUNK_TARGET = 2200;
const TIME_BUDGET_MS = 24000;

// Names that should stay in Latin script rather than being transliterated.
const PROTECTED = [
  'Google for Nonprofits', 'Google Workspace', 'Google Ad Grants', 'Google',
  'Microsoft 365', 'Microsoft Azure', 'Microsoft', 'Azure', 'TechSoup',
  'Goodstack', 'GitHub', 'AWS', 'Salesforce', 'Mailchimp', 'Zoom', 'Zoho',
  'Cloudflare', 'Twilio', 'Adobe', 'Canva', 'NGO', 'FCRA', 'CSR', '80G', '12A',
];

/* ------------------------------------------------------------------ helpers */

function json(bodyObj, status) {
  return new Response(JSON.stringify(bodyObj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function resolveCode(input) {
  const raw = String(input == null ? '' : input).trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (LANGS[lower]) return lower;
  for (const code of Object.keys(LANGS)) {
    if (LANGS[code].name.toLowerCase() === lower) return code;
    if (LANGS[code].flores.toLowerCase() === lower) return code;
  }
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ----------------------------------------------- markdown-safe line handling */

// Leading markdown that must not be translated: headings, bullets, numbers, quotes.
/**
 * Everything at the start of a line that is structure rather than prose.
 *
 * The list only covered markdown (- * + 1. # >), but these articles were
 * pasted out of a word processor and use "•" with a tab, "☐" for checklist
 * boxes and "📌" for callouts. Those were being handed to the translator as
 * if they were words, so a translated article could come back without the
 * markers the reading view uses to find bullets, checklists and callouts —
 * which is why translated guides fell back to plain prose.
 */
const PREFIX_RE =
  /^(\s*(?:#{1,6}\s+|[-*+]\s+|\d+[.)][ \t]*|>\s*|[•·▪●][ \t]*|📌[ \t]*)?(?:[☐☑☒✅][ \t]*)?)([\s\S]*)$/;

// Lines with no letters (rules, separators, blank) are left exactly as they are.
function isUntranslatable(line) {
  return !/[A-Za-z]/.test(line);
}

/**
 * Split a line into runs that must survive verbatim and runs to translate.
 *
 * The previous approach swapped protected spans for markers like "zq3zq",
 * translated the whole line, then swapped them back. IndicTrans2 transliterates
 * those markers into the target script — "zq1zq" comes back as
 * "झेडक्यूझेडक्यू", "జెడ్ క్యూ 1 జెడ్ క్యూ", "ઝેડ. ક્યુ. ઝેડ. ક્યુ." — and
 * sometimes drops the digit entirely, so the restore step could neither find
 * the marker nor tell which span it had stood for. The marker text was left on
 * the page and the URL or brand name it was guarding was gone. Seven of the
 * first twenty-two published translations were damaged this way.
 *
 * Nothing that must survive is sent to the model any more. Each protected run
 * is held back and concatenated into place afterwards.
 */
const PROTECT_RE = new RegExp(
  [
    '`[^`]*`',
    '!?\\[[^\\]]*\\]\\([^)]*\\)',
    'https?://[^\\s)]+',
    '\\b[\\w.+-]+@[\\w-]+\\.[\\w.]+\\b',
    '\\*\\*|__',
    PROTECTED.map((t) => '\\b' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').join('|'),
  ].join('|'),
  'g'
);

/** @returns {{keep?: string, text?: string}[]} in original order. */
function segmentLine(line) {
  const parts = [];
  let last = 0;
  let m;
  PROTECT_RE.lastIndex = 0;
  while ((m = PROTECT_RE.exec(line)) !== null) {
    if (m.index > last) parts.push({ text: line.slice(last, m.index) });
    parts.push({ keep: m[0] });
    last = m.index + m[0].length;
    if (m[0] === '') PROTECT_RE.lastIndex++;   // never loop on an empty match
  }
  if (last < line.length) parts.push({ text: line.slice(last) });
  return parts;
}

/**
 * Translated segments come back without the spacing that sat around them, so
 * the original leading and trailing whitespace is put back rather than trusted.
 * Without this you get "Google Workspacemein" where a brand name met a word.
 */
function rejoin(parts, translated) {
  let out = '';
  for (const part of parts) {
    if ('keep' in part) { out += part.keep; continue; }
    if (part.job === undefined) { out += part.text; continue; }
    const lead = (part.text.match(/^\s*/) || [''])[0];
    const trail = (part.text.match(/\s*$/) || [''])[0];
    out += lead + String(translated[part.job] == null ? '' : translated[part.job]).trim() + trail;
  }
  return out;
}

function tidySpacing(text) {
  return String(text)
  .replace(/\*[ \t]+\*/g, '**')
  .replace(/_[ \t]+_/g, '__')
  .replace(/\*\*[ \t]*([^*\n]+?)[ \t]*\*\*/g, '**$1**')
  .replace(/__[ \t]*([^_\n]+?)[ \t]*__/g, '__$1__')
  .replace(/[ \t]{2,}/g, ' ')
  .replace(/[ \t]+([,.;:!?)\]।])/g, '$1')
  .replace(/([(\[])[ \t]+/g, '$1')
  .trim();
}

/* ------------------------------------------------------- engine: IndicTrans2 */

// Published schema: input { text: string | string[], target_language }
// output { translations: string[] }.  Batching keeps it to one call per article.
const INDIC_BATCH = 40;

function extractTranslations(res, expected) {
  const pick = (v) => (Array.isArray(v) ? v : typeof v === 'string' ? [v] : null);
  let out =
    pick(res && res.translations) ||
    pick(res && res.translated_text) ||
    pick(res && res.translation) ||
    pick(res && res.result) ||
    pick(typeof res === 'string' ? res : null);
  if (!out) {
    const keys = res && typeof res === 'object' ? Object.keys(res).join(', ') : typeof res;
    throw new Error('Workers AI response had no translations (keys: ' + keys + ')');
  }
  if (out.length !== expected) {
    throw new Error('Workers AI returned ' + out.length + ' translations for ' + expected + ' inputs');
  }
  return out.map((t) => String(t == null ? '' : t));
}

async function runIndic(ai, texts, flores) {
  const results = [];
  for (let i = 0; i < texts.length; i += INDIC_BATCH) {
    const batch = texts.slice(i, i + INDIC_BATCH);
    const res = await ai.run(INDIC_MODEL, { text: batch, target_language: flores });
    const got = extractTranslations(res, batch.length);
    for (const t of got) results.push(t);
  }
  return results;
}

async function translateWithIndic(ai, title, body, flores) {
  const lines = String(body).split('\n');
  const jobs = [];
  const plan = [];
  let inCodeFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      plan.push({ keep: line });
      continue;
    }
    if (inCodeFence || isUntranslatable(line)) {
      plan.push({ keep: line });
      continue;
    }
    const m = line.match(PREFIX_RE);
    const prefix = m ? m[1] : '';
    const content = m ? m[2] : line;
    if (!content.trim()) {
      plan.push({ keep: line });
      continue;
    }
    const parts = segmentLine(content);
    for (const part of parts) {
      if ('keep' in part) continue;
      if (!part.text.trim()) continue;          // whitespace only, nothing to translate
      part.job = jobs.length;
      jobs.push(part.text.trim());
    }
    plan.push({ prefix: prefix, parts: parts });
  }

  const titleParts = segmentLine(String(title));
  for (const part of titleParts) {
    if ('keep' in part) continue;
    if (!part.text.trim()) continue;
    part.job = jobs.length;
    jobs.push(part.text.trim());
  }

  const translated = await runIndic(ai, jobs, flores);

  const outLines = plan.map((step) =>
    'keep' in step ? step.keep : step.prefix + tidySpacing(rejoin(step.parts, translated))
  );

  return {
    translatedTitle: tidySpacing(rejoin(titleParts, translated)),
    translatedBody: outLines.join('\n'),
  };
}

/* ------------------------------------------------------------ engine: Gemini */

function buildPrompt(title, body, languageName) {
  return [
    'You are a professional translator localising a knowledge-base article for',
    'Indian non-profit / NGO staff. Translate from English into ' + languageName + '.',
    '',
    'Rules - follow all of them:',
    '1. Preserve the Markdown structure EXACTLY: heading levels (###), bullet and',
    '   numbered lists, **bold**, tables, blockquotes, code blocks and line breaks.',
    '2. Do NOT translate URLs, email addresses or code. Copy them verbatim.',
    '3. Keep product and programme names in Latin script (Google for Nonprofits,',
    '   Microsoft 365, Canva, TechSoup, Goodstack, GitHub, AWS, Azure, Salesforce,',
    '   Mailchimp, Zoom, Zoho, Cloudflare, Twilio, Adobe, 80G, 12A, FCRA, CSR, NGO).',
    '4. Use clear, simple ' + languageName + ' that non-technical NGO staff can follow.',
    '5. Keep all numbers, currency amounts, percentages and dates unchanged.',
    '6. Translate the title concisely - no commentary, no quotation marks.',
    '',
    'Return ONLY JSON matching the schema. No markdown fences, no explanation.',
    '',
    '--- TITLE (English) ---',
    title,
    '',
    '--- BODY (English, Markdown) ---',
    body,
  ].join('\n');
}

async function runGemini(apiKey, model, title, body, languageName, signal) {
  const generationConfig = {
    temperature: 0.2,
    maxOutputTokens: Math.min(32768, Math.max(2048, Math.ceil(body.length / 4) * 6 + 1024)),
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'OBJECT',
      properties: {
        translatedTitle: { type: 'STRING' },
        translatedBody: { type: 'STRING' },
      },
      required: ['translatedTitle', 'translatedBody'],
    },
  };
  if (model.indexOf('gemini-2.5') === 0) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const res = await fetch(GEMINI_ROOT + '/' + model + ':generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: buildPrompt(title, body, languageName) }] }],
      generationConfig,
    }),
    signal,
  });

  const raw = await res.text();
  if (!res.ok) {
    let message = raw.slice(0, 300);
    try {
      message = JSON.parse(raw).error.message || message;
    } catch (e) { /* keep raw */ }
    const err = new Error(message);
    err.status = res.status;
    err.retryable = [400, 404, 429, 500, 503].indexOf(res.status) !== -1;
    throw err;
  }

  const data = JSON.parse(raw);
  const candidate = data && data.candidates && data.candidates[0];
  const finish = candidate && candidate.finishReason;
  if (finish === 'MAX_TOKENS') {
    throw new Error('That section was too long to translate in one request.');
  }

  const parts = (candidate && candidate.content && candidate.content.parts) || [];
  const text = parts.map((p) => (p && p.text) || '').join('').trim()
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '');
  if (!text) throw new Error('Gemini returned an empty translation.');

  const parsed = JSON.parse(text);
  const translatedTitle = String(parsed.translatedTitle || '').trim();
  const translatedBody = String(parsed.translatedBody || '').trim();
  if (!translatedTitle || !translatedBody) {
    throw new Error('Gemini returned an incomplete translation.');
  }
  return { translatedTitle, translatedBody };
}

/**
 * Split markdown at blank-line boundaries into pieces of roughly `target`
 * characters, so no single Gemini request is large enough to blow the
 * per-minute token limit.
 */
function chunkMarkdown(body, target) {
  const parts = String(body).split(/(\n{2,})/);
  const chunks = [];
  let current = '';
  for (let i = 0; i < parts.length; i += 2) {
    const block = parts[i];
    const sep = parts[i + 1] || '';
    if (current && current.length + block.length > target) {
      chunks.push(current);
      current = '';
    }
    current += block + sep;
  }
  if (current.trim()) chunks.push(current);
  return chunks.length ? chunks : [String(body)];
}

async function translateWithGemini(apiKey, env, title, body, languageName, signal, deadline) {
  const preferred = env.GEMINI_MODEL;
  const models = preferred
    ? [preferred].concat(GEMINI_MODELS.filter((m) => m !== preferred))
    : GEMINI_MODELS;

  const attempt = async (t, b) => {
    let lastError;
    for (const model of models) {
      try {
        return await runGemini(apiKey, model, t, b, languageName, signal);
      } catch (err) {
        lastError = err;
        if (!err.retryable || signal.aborted) break;
        await sleep(300);
      }
    }
    throw lastError || new Error('Gemini translation failed.');
  };

  if (body.length <= CHUNK_TARGET) return attempt(title, body);

  const chunks = chunkMarkdown(body, CHUNK_TARGET);
  const out = [];
  let translatedTitle = null;
  for (let i = 0; i < chunks.length; i++) {
    if (Date.now() > deadline) throw new Error('DEADLINE');
    const res = await attempt(i === 0 ? title : 'Section', chunks[i]);
    if (i === 0) translatedTitle = res.translatedTitle;
    out.push(res.translatedBody.trim());
    if (i < chunks.length - 1) await sleep(700);
  }
  return { translatedTitle: translatedTitle, translatedBody: out.join('\n\n') };
}

/* --------------------------------------------------------------- entry point */

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed. Use POST.' }, 405);
  }

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return json({ error: 'Request body must be JSON.' }, 400);
  }

  const { title, body, targetLanguage } = payload || {};
  if (!title || !body || !targetLanguage) {
    return json({ error: 'title, body and targetLanguage are all required.' }, 400);
  }

  const code = resolveCode(targetLanguage);
  if (!code) {
    return json({ error: 'Unsupported target language: ' + targetLanguage }, 400);
  }
  if (code === 'en') {
    return json({ translatedTitle: title, translatedBody: body, engine: 'none' });
  }

  const lang = LANGS[code];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIME_BUDGET_MS + 4000);
  const deadline = Date.now() + TIME_BUDGET_MS;
  const problems = [];

  const tryIndic = async () => {
    if (!env.AI) throw new Error('No Workers AI binding on this project.');
    const r = await translateWithIndic(env.AI, title, body, lang.flores, deadline);
    return Object.assign(r, { engine: 'indictrans2' });
  };
  const tryGemini = async () => {
    if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set.');
    const r = await translateWithGemini(
      env.GEMINI_API_KEY, env, title, body, lang.name, controller.signal, deadline
    );
    return Object.assign(r, { engine: 'gemini' });
  };

  const order = env.TRANSLATE_PROVIDER === 'gemini'
    ? [['gemini', tryGemini], ['indictrans2', tryIndic]]
    : [['indictrans2', tryIndic], ['gemini', tryGemini]];

  try {
    for (const pair of order) {
      try {
        return json(await pair[1]());
      } catch (err) {
        const msg = err && err.message === 'DEADLINE'
          ? 'took too long - the article is very long'
          : (err && err.message) || 'unknown error';
        problems.push(pair[0] + ': ' + msg);
      }
    }

    return json(
      {
        error:
          'Both translation engines failed. ' + problems.join(' | ') +
          '. If Gemini reports a quota problem, wait for the daily reset or add a ' +
          'Workers AI binding so IndicTrans2 can handle it instead.',
      },
      502
    );
  } finally {
    clearTimeout(timer);
  }
}
