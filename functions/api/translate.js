/**
 * Cloudflare Pages Function - POST /api/translate
 *
 * Real Gemini-powered article translation for the NGO Knowledge Hub admin portal.
 * Cloudflare Pages maps functions/api/translate.js to the URL /api/translate.
 *
 * Required environment variable (Settings -> Variables and Secrets):
 *   GEMINI_API_KEY   - from https://aistudio.google.com/apikey
 * Optional:
 *   GEMINI_MODEL     - override the model (default: gemini-2.5-flash)
 *
 * Request  : { title, body, targetLanguage }
 * Response : { translatedTitle, translatedBody }  or  { error }
 *
 * Runs on the Workers runtime, so secrets come from context.env, not process.env.
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

const MODEL_FALLBACKS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models';

function resolveLanguage(input) {
    const raw = String(input || '').trim();
    if (!raw) return null;
    const byCode = LANGUAGES[raw.toLowerCase()];
    if (byCode) return byCode;
    const byName = Object.values(LANGUAGES).find(
        (name) => name.toLowerCase() === raw.toLowerCase()
        );
    return byName || raw;
}

function maxTokensFor(model) {
    return model.startsWith('gemini-2.5') ? 32768 : 8192;
}

function buildPrompt(title, body, languageName) {
    return [
        `You are a professional translator localising a knowledge-base article for`,
        `Indian non-profit / NGO staff. Translate from English into ${languageName}.`,
        ``,
        `Rules - follow all of them:`,
        `1. Preserve the Markdown structure EXACTLY: heading levels (###), bullet and`,
        `   numbered lists, **bold**, tables, blockquotes, code blocks, horizontal rules`,
        `   and line breaks must stay in the same positions.`,
        `2. Do NOT translate URLs, email addresses, or code. Copy them verbatim.`,
        `3. Keep product, company and programme names in their original Latin script`,
        `   (for example: Google for Nonprofits, Microsoft 365, Canva, TechSoup,`,
        `   Goodstack, GitHub, AWS, Azure, Salesforce, Mailchimp, Zoom, Zoho,`,
        `   Cloudflare, Twilio, Adobe, 80G, 12A, FCRA, CSR, NGO).`,
        `4. Use clear, simple, respectful ${languageName} that non-technical NGO staff`,
        `   can follow. Prefer plain wording over literal word-for-word translation.`,
        `5. Keep all numbers, currency amounts, percentages and dates unchanged.`,
        `6. Translate the title concisely - do not add commentary or quotation marks.`,
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
    } catch (e) { /* keep raw text */ }
    const err = new Error(message);
    err.status = res.status;
    err.retryable = [400, 404, 429, 500, 503].indexOf(res.status) !== -1;
    throw err;
}

let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        throw new Error('Gemini returned a response that was not valid JSON.');
    }

const candidate = data?.candidates?.[0];
    const finish = candidate?.finishReason;

if (finish === 'MAX_TOKENS') {
    throw new Error('The article is too long to translate in one request. Split it into shorter sections and translate each one.');
}
    if (finish && finish !== 'STOP') {
        throw new Error(`Gemini stopped early (${finish}). Please try again.`);
    }

const text = (candidate?.content?.parts || [])
    .map((p) => p?.text || '')
    .join('')
    .trim();

if (!text) throw new Error('Gemini returned an empty translation.');

const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch (e) {
        throw new Error('Could not parse the translation returned by Gemini.');
    }

const translatedTitle = String(parsed.translatedTitle || '').trim();
    const translatedBody = String(parsed.translatedBody || '').trim();

if (!translatedTitle || !translatedBody) {
    throw new Error('Gemini returned an incomplete translation.');
}

return { translatedTitle, translatedBody };
}

function json(bodyObj, status) {
    return new Response(JSON.stringify(bodyObj), {
        status: status || 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
}

export async function onRequest(context) {
    const { request, env } = context;

if (request.method !== 'POST') {
    return json({ error: 'Method not allowed. Use POST.' }, 405);
}

const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
        return json({ error: 'GEMINI_API_KEY is not set for this project. Add it in Cloudflare under Settings > Variables and Secrets, then redeploy.' }, 500);
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

const languageName = resolveLanguage(targetLanguage);
    if (!languageName) {
        return json({ error: 'targetLanguage could not be recognised.' }, 400);
    }
    if (languageName === 'English') {
        return json({ translatedTitle: title, translatedBody: body });
    }

const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);

const preferred = env.GEMINI_MODEL;
    const models = preferred
    ? [preferred].concat(MODEL_FALLBACKS.filter((m) => m !== preferred))
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
            if (!err.retryable || controller.signal.aborted) break;
        }
    }

    if (controller.signal.aborted) {
        return json({ error: 'Translation timed out. This article is very long - try splitting it into shorter sections, or set GEMINI_MODEL to gemini-2.0-flash for a faster model.' }, 504);
    }

    console.error('[translate] failed:', lastError && lastError.message);
    return json({ error: (lastError && lastError.message) || 'Translation failed.' }, 502);
} finally {
    clearTimeout(timer);
}
}
