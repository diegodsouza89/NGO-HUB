/**
 * POST /api/translate  —  real Gemini-powered article translation.
 *
 * Replaces the placeholder in server.ts, which returned the English text
 * unchanged. Runs as a Netlify Function so it works on static Netlify hosting
 * (where the Express server in server.ts never runs).
 *
 * Required Netlify environment variable:
 *   GEMINI_API_KEY   — get one from https://aistudio.google.com/apikey
 * Optional:
 *   GEMINI_MODEL     — override the model (default: gemini-2.5-flash)
 *
 * Request  : { title: string, body: string, targetLanguage: string }
 *            targetLanguage may be a code ("hi") or a name ("Hindi").
 * Response : { translatedTitle: string, translatedBody: string }
 * On error : { error: string }   with a non-200 status
 */

const LANGUAGES = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
  ta: 'Tamil',
  te: 'Telugu',
  bn: 'Bengali',
  gu: 'Gujarati',
  kn: 'Kannada',
};

// Tried in order. If a model name is retired by Google, the next one is used,
// so this keeps working without a code change.
const MODEL_FALLBACKS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models';

function resolveLanguage(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  const byCode = LANGUAGES[raw.toLowerCase()];
  if (byCode) return byCode;
  const known = Object.values(LANGUAGES).find(
    (name) => name.toLowerCase() === raw.toLowerCase()
  );
  return known || raw; // fall back to whatever was sent
}

function maxTokensFor(model) {
  return model.startsWith('gemini-2.5') ? 32768 : 8192;
}

function buildPrompt(title, body, languageName) {
  return [
    `You are a professional translator localising a knowledge-base article for`,
    `Indian non-profit / NGO staff. Translate from English into ${languageName}.`,
    ``,
    `Rules — follow all of them:`,
    `1. Preserve the Markdown structure EXACTLY: heading levels (###), bullet and`,
    `   numbered lists, **bold**, tables, blockquotes, code blocks, horizontal rules`,
    `   and line breaks must stay in the same positions.`,
    `2. Do NOT translate URLs, email addresses, or code. Copy them verbatim.`,
    `3. Keep product, company and programme names in their original Latin script`,
    `   (for example: Google for Nonprofits, Microsoft 365, Canva, TechSoup,`,
    `   Goodstack, GitHub, AWS, Azure, Salesforce, Mailchimp, Zoom, Zoho,`,
    `   Cloudflare, Twilio, Adobe, 80G, 12A, FCRA, CSR, NGO). You may add a short`,
    `   ${languageName} gloss in brackets the first time if it genuinely helps.`,
    `4. Use clear, simple, respectful ${languageName} that non-technical NGO staff`,
    `   can follow. Prefer plain wording over literal word-for-word translation.`,
    `5. Keep all numbers, currency amounts, percentages and dates unchanged.`,
    `6. Translate the title concisely — do not add commentary or quotation marks.`,
    ``,
    `Return ONLY JSON matching the schema. No markdown fences, no explanation.`,
    ``,
    `--- TITLE (English) ---`,
    title,
    ``,
    `--- BODY (English, Markdown) ---`,
    body,
  ].join('\n');
}

async function callGemini({ apiKey, model, title, body, languageName, signal }) {
  const payload = {
    contents: [{ role: 'user', parts: [{ text: buildPrompt(title, body, languageName) }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: maxTokensFor(model),
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          translatedTitle: { type: 'STRING' },
          translatedBody: { type: 'STRING' },
        },
        required: ['translatedTitle', 'translatedBody'],
      },
    },
  };

  // 2.5 models "think" by default, which costs seconds we do not have inside
  // a 10-second function timeout. Turn it off.
  if (model.startsWith('gemini-2.5')) {
    payload.generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const res = await fetch(`${API_ROOT}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(payload),
    signal,
  });

  const raw = await res.text();

  if (!res.ok) {
    let message = raw.slice(0, 300);
    try {
      message = JSON.parse(raw)?.error?.message || message;
    } catch { /* keep raw text */ }
    const err = new Error(message);
    err.status = res.status;
    err.retryable = res.status === 404 || res.status === 400;
    throw err;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Gemini returned a response that was not valid JSON.');
  }

  const candidate = data?.candidates?.[0];
  const finish = candidate?.finishReason;

  if (finish === 'MAX_TOKENS') {
    throw new Error(
      'The article is too long to translate in one request. Split it into shorter sections and translate each one.'
    );
  }
  if (finish && finish !== 'STOP') {
    throw new Error(`Gemini stopped early (${finish}). Please try again.`);
  }

  const text = (candidate?.content?.parts || [])
    .map((p) => p?.text || '')
    .join('')
    .trim();

  if (!text) throw new Error('Gemini returned an empty translation.');

  // Strip accidental ``` fences before parsing.
  const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the translation returned by Gemini.');
  }

  const translatedTitle = String(parsed.translatedTitle || '').trim();
  const translatedBody = String(parsed.translatedBody || '').trim();

  if (!translatedTitle || !translatedBody) {
    throw new Error('Gemini returned an incomplete translation.');
  }

  return { translatedTitle, translatedBody };
}

function json(bodyObj, status = 200) {
  return new Response(JSON.stringify(bodyObj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export default async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed. Use POST.' }, 405);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json(
      {
        error:
          'GEMINI_API_KEY is not set on this site. Add it in Netlify under ' +
          'Site configuration → Environment variables, then redeploy.',
      },
      500
    );
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Request body must be JSON.' }, 400);
  }

  const { title, body, targetLanguage } = payload || {};
  if (!title || !body || !targetLanguage) {
    return json({ error: 'title, body and targetLanguage are all required.' }, 400);
  }

  const languageName = resolveLanguage(targetLanguage);
  if (!languageName) {
    return json({ error: 'targetLanguage could not be recognised.' }, 400);
  }
  if (languageName === 'English') {
    // Nothing to do — English is the source language.
    return json({ translatedTitle: title, translatedBody: body });
  }

  // Leave headroom inside Netlify's function timeout so we can return a clean
  // error instead of the platform killing us with an opaque 502.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 24_000);

  const preferred = process.env.GEMINI_MODEL;
  const models = preferred
    ? [preferred, ...MODEL_FALLBACKS.filter((m) => m !== preferred)]
    : MODEL_FALLBACKS;

  try {
    let lastError;
    for (const model of models) {
      try {
        const result = await callGemini({
          apiKey,
          model,
          title,
          body,
          languageName,
          signal: controller.signal,
        });
        return json(result);
      } catch (err) {
        lastError = err;
        // Only walk to the next model when this one is unavailable/rejected.
        if (!err.retryable || controller.signal.aborted) break;
      }
    }

    if (controller.signal.aborted) {
      return json(
        {
          error:
            'Translation timed out. This article is very long — try splitting it ' +
            'into shorter sections, or set GEMINI_MODEL=gemini-2.0-flash for a faster model.',
        },
        504
      );
    }

    console.error('[translate] failed:', lastError);
    return json({ error: lastError?.message || 'Translation failed.' }, 502);
  } finally {
    clearTimeout(timer);
  }
};

export const config = {
  path: '/api/translate',
};
