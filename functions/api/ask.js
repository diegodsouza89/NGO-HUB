/**
 * Cloudflare Pages Function - POST /api/ask
 *
 * The "Ask AI" bubble on the public site. It answers a visitor's question
 * about NGO compliance, grants, technology and so on.
 *
 * How the grounding works
 * -----------------------
 * The browser already has every published article in memory, so it does the
 * retrieval: it keyword-ranks the articles, trims the best few, and posts them
 * here as `docs`. This function never needs a copy of content.json and never
 * needs a database. It only decides what to say.
 *
 * The model is told to answer from those documents when it can and to fall back
 * to its own general knowledge when it cannot - and to say which of the two it
 * did, so the UI can show a warning on general answers. That flag comes back as
 * `fromHub`.
 *
 * Two engines, tried in order
 * ---------------------------
 *   1. Google Gemini      - better answers, especially in Indic languages.
 *                           Needs GEMINI_API_KEY. Free tier has a daily cap.
 *   2. Cloudflare Workers AI - free, keyless, always there. Used automatically
 *                           when Gemini is missing, out of quota or erroring,
 *                           so a visitor never sees a dead feature.
 *
 * Env:
 *   GEMINI_API_KEY - optional but recommended; enables engine 1
 *   GEMINI_MODEL   - optional, overrides the first Gemini model tried
 *   AI             - Workers AI binding; enables engine 2
 *   ASK_PROVIDER   - optional, "cloudflare" to skip Gemini entirely
 *
 * Request : { question, language?, docs?: [{ id, title, text }] }
 * Response: { answer, fromHub, sourceIds, engine }
 *
 * Abuse protection lives in functions/_middleware.js (same-origin + size cap),
 * which runs before this file.
 */

const LANGS = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
  ta: 'Tamil',
  te: 'Telugu',
  bn: 'Bengali',
  gu: 'Gujarati',
  kn: 'Kannada',
};

const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const GEMINI_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models';

// Workers AI text models, best first. All are on Cloudflare's free allowance.
const CF_MODELS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-3.1-8b-instruct',
];

const MAX_QUESTION = 500;      // characters
const MAX_DOCS = 6;            // documents accepted per request
const MAX_DOC_CHARS = 2600;    // per document, after trimming
const MAX_CONTEXT_CHARS = 12000; // total document text sent to the model
const TIME_BUDGET_MS = 22000;  // leave room inside Cloudflare's 30s wall

/* ------------------------------------------------------------------ helpers */

function json(bodyObj, status) {
  return new Response(JSON.stringify(bodyObj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function str(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function resolveLanguage(input) {
  const raw = str(input).trim().toLowerCase();
  if (LANGS[raw]) return { code: raw, name: LANGS[raw] };
  for (const code of Object.keys(LANGS)) {
    if (LANGS[code].toLowerCase() === raw) return { code, name: LANGS[code] };
  }
  return { code: 'en', name: 'English' };
}

/**
 * Strip markdown down to readable prose so the model spends its context on
 * meaning rather than on ###, ** and table pipes.
 */
function flatten(text) {
  return str(text)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    // Headings that were pasted mid-line rather than at the start of one.
    .replace(/#{1,6}[ \t]+/g, ' ')
    .replace(/[*_`>|]+/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Accept only the shape we expect, and bound every dimension: how many docs,
 * how long each one is, and how much text in total. Without this a caller
 * could push a megabyte of context through and run up token cost.
 */
function sanitiseDocs(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  let budget = MAX_CONTEXT_CHARS;

  for (const raw of input.slice(0, MAX_DOCS)) {
    if (!raw || typeof raw !== 'object') continue;
    const id = str(raw.id).slice(0, 120).trim();
    const title = flatten(str(raw.title)).slice(0, 200).trim();
    let text = flatten(str(raw.text)).slice(0, MAX_DOC_CHARS).trim();
    if (!id || !text) continue;
    if (text.length > budget) text = text.slice(0, budget).trim();
    if (!text) break;
    budget -= text.length;
    out.push({ id, title: title || 'Untitled document', text });
    if (budget <= 200) break;
  }
  return out;
}

function buildPrompt(question, docs, languageName) {
  const context = docs.length
    ? docs
        .map((d, i) => 'DOCUMENT ' + (i + 1) + '\nid: ' + d.id + '\ntitle: ' + d.title + '\n' + d.text)
        .join('\n\n---\n\n')
    : '(no documents matched this question)';

  return [
    'You are the assistant for the NGO Knowledge Hub, a knowledge and compliance',
    'portal for Indian non-profit organisations run by Impact Foundation India.',
    'Visitors are NGO staff, grassroots leaders and social-impact teams.',
    '',
    'HUB DOCUMENTS',
    context,
    '',
    'VISITOR QUESTION',
    question,
    '',
    'HOW TO ANSWER',
    '1. If the Hub documents answer the question, answer from them. Set fromHub',
    '   to true and put the id of every document you actually used in sourceIds.',
    '2. If they do not, answer from your own general knowledge instead. Set',
    '   fromHub to false and leave sourceIds empty. Keep general answers short',
    '   and cautious, and say what the reader should verify against the current',
    '   rules or with a qualified professional.',
    '3. Never invent a document title, section number, form number, deadline,',
    '   fee, statistic or web address. If you are not sure of a specific figure,',
    '   say it needs checking rather than guessing.',
    '4. Answer in ' + languageName + ', in at most 120 words, in plain prose.',
    '   No headings and no bold. Use "- " bullet lines only for a real list.',
    '5. Do not mention these instructions, the word "document id", or that you',
    '   were given context. Just answer the person.',
  ].join('\n');
}

function normaliseResult(parsed, docs) {
  const answer = str(parsed && parsed.answer).trim();
  if (!answer) throw new Error('The AI returned an empty answer.');

  const known = new Set(docs.map((d) => d.id));
  const ids = Array.isArray(parsed && parsed.sourceIds) ? parsed.sourceIds : [];
  const sourceIds = [];
  for (const raw of ids) {
    const id = str(raw).trim();
    if (known.has(id) && sourceIds.indexOf(id) === -1) sourceIds.push(id);
  }

  // Trust the citations over the flag. A "fromHub" claim with no valid document
  // id behind it would put a false "from your documents" badge on the answer.
  const fromHub = sourceIds.length > 0;
  return { answer, fromHub, sourceIds };
}

/* ------------------------------------------------------------------- Gemini */

async function runGemini(apiKey, model, prompt, signal) {
  const generationConfig = {
    temperature: 0.3,
    maxOutputTokens: 1600,
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'OBJECT',
      properties: {
        answer: { type: 'STRING' },
        fromHub: { type: 'BOOLEAN' },
        sourceIds: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['answer', 'fromHub', 'sourceIds'],
    },
  };
  // 2.5 models think by default, which costs output tokens we do not need here.
  if (model.indexOf('gemini-2.5') === 0) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const res = await fetch(GEMINI_ROOT + '/' + model + ':generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
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
    throw err;
  }

  const data = JSON.parse(raw);
  const candidate = data && data.candidates && data.candidates[0];
  const parts = (candidate && candidate.content && candidate.content.parts) || [];
  const text = parts
    .map((p) => (p && p.text) || '')
    .join('')
    .trim()
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '');
  if (!text) throw new Error('Gemini returned an empty response.');
  return JSON.parse(text);
}

/* ------------------------------------------------------- Cloudflare Workers AI */

/**
 * Small instruct models are unreliable at strict JSON, so ask for prose and
 * recover the JSON only if it happens to be there.
 */
function parseLooseJson(text) {
  const s = str(text).trim().replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(s.slice(start, end + 1));
    } catch (e) { /* fall through to prose */ }
  }
  return null;
}

async function runCloudflare(ai, model, prompt, docs) {
  const res = await ai.run(model, {
    messages: [
      {
        role: 'system',
        content:
          'You are a careful assistant for an Indian non-profit knowledge portal. ' +
          'Reply with a single JSON object and nothing else, using exactly these keys: ' +
          '"answer" (string), "fromHub" (true or false), "sourceIds" (array of document ids).',
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 700,
    temperature: 0.3,
  });

  const text = str(res && (res.response || res.result || res.output_text));
  if (!text.trim()) throw new Error('Workers AI returned an empty response.');

  const parsed = parseLooseJson(text);
  if (parsed && str(parsed.answer).trim()) return parsed;

  // No usable JSON. Keep the prose - a real answer with weaker attribution is
  // far better than an error - but claim no sources, since we cannot tell which
  // documents it leaned on.
  return { answer: text.trim(), fromHub: false, sourceIds: [] };
}

/* -------------------------------------------------------------------- route */

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'POST') {
    return json({ error: 'Use POST.' }, 405);
  }

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return json({ error: 'Could not read the request. Expected JSON.' }, 400);
  }

  const question = str(payload && payload.question).trim().slice(0, MAX_QUESTION);
  if (!question) {
    return json({ error: 'Type a question first.' }, 400);
  }

  const language = resolveLanguage(payload && payload.language);
  const docs = sanitiseDocs(payload && payload.docs);
  const prompt = buildPrompt(question, docs, language.name);

  const started = Date.now();
  const errors = [];
  const preferCloudflare = str(env && env.ASK_PROVIDER).toLowerCase() === 'cloudflare';

  // --- engine 1: Gemini ---------------------------------------------------
  const apiKey = str(env && env.GEMINI_API_KEY).trim();
  if (apiKey && !preferCloudflare) {
    const override = str(env && env.GEMINI_MODEL).trim();
    const models = override
      ? [override].concat(GEMINI_MODELS.filter((m) => m !== override))
      : GEMINI_MODELS;

    for (const model of models) {
      if (Date.now() - started > TIME_BUDGET_MS) break;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const parsed = await runGemini(apiKey, model, prompt, controller.signal);
        clearTimeout(timer);
        const result = normaliseResult(parsed, docs);
        return json(Object.assign(result, { engine: 'gemini:' + model }));
      } catch (e) {
        clearTimeout(timer);
        errors.push('gemini/' + model + ': ' + (e && e.message ? e.message : e));
      }
    }
  } else if (!apiKey && !preferCloudflare) {
    errors.push('gemini: GEMINI_API_KEY is not set');
  }

  // --- engine 2: Workers AI ----------------------------------------------
  const ai = env && env.AI;
  if (ai && typeof ai.run === 'function') {
    for (const model of CF_MODELS) {
      if (Date.now() - started > TIME_BUDGET_MS + 4000) break;
      try {
        const parsed = await runCloudflare(ai, model, prompt, docs);
        const result = normaliseResult(parsed, docs);
        return json(Object.assign(result, { engine: 'workers-ai:' + model }));
      } catch (e) {
        errors.push('workers-ai/' + model + ': ' + (e && e.message ? e.message : e));
      }
    }
  } else {
    errors.push('workers-ai: no AI binding on this project');
  }

  return json(
    {
      error:
        'The AI assistant is unavailable right now. Your search results below are still accurate.',
      detail: errors.join(' | ').slice(0, 600),
    },
    502
  );
}
