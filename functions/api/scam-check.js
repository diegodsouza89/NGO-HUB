/**
 * Cloudflare Pages Function - POST /api/scam-check
 *
 * The "Is this a scam?" checker for NGOs. A visitor pastes a suspicious
 * message, link, phone number or sender address, or uploads a screenshot, and
 * gets back a verdict, a risk score, the red flags found, and what to do next.
 *
 * Two layers, merged into one answer
 * ----------------------------------
 *   1. Rules  - deterministic checks that always run, even if every AI engine
 *               is down. Tuned for scams aimed at Indian NGOs: fake FCRA / 12A /
 *               80G / CSR-1 / Darpan notices, "grant processing fees", fake KYC,
 *               digital-arrest calls, UPI collect requests, lookalike gov.in
 *               domains, shortened links, and so on.
 *   2. AI     - reads the content like a person would and explains it.
 *               Gemini first (handles screenshots natively), then Cloudflare
 *               Workers AI (free, keyless) as the fallback.
 *   Optional: Google Safe Browsing lookup for every link, if SAFE_BROWSING_KEY
 *             is set.
 *
 * Privacy: nothing is stored. The content is checked and discarded.
 *
 * Env:
 *   GEMINI_API_KEY    - optional, recommended (also used by /api/ask)
 *   GEMINI_MODEL      - optional override
 *   AI                - Workers AI binding (Settings > Functions > AI bindings)
 *   SAFE_BROWSING_KEY - optional Google Safe Browsing v4 API key
 *
 * Request : { text?, image?: "data:image/jpeg;base64,...", language? }
 * Response: { verdict, score, summary, flags[], advice[], links[], engine }
 *            verdict = "scam" | "suspicious" | "likely_safe"
 */

const LANGS = {
  en: 'English', hi: 'Hindi', mr: 'Marathi', ta: 'Tamil',
  te: 'Telugu', bn: 'Bengali', gu: 'Gujarati', kn: 'Kannada',
};

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const GEMINI_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models';
const CF_TEXT_MODELS = ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-3.1-8b-instruct'];
const CF_VISION_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';

const MAX_TEXT = 6000;
const MAX_IMAGE_CHARS = 3_000_000; // ~2.2 MB of base64
const TIME_BUDGET_MS = 22000;

/* ------------------------------------------------------------------ helpers */

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function resolveLanguage(input) {
  const raw = str(input).trim().toLowerCase();
  return LANGS[raw] ? LANGS[raw] : 'English';
}

/* -------------------------------------------------------------- rule engine */

// [id, regex, weight, plain-English flag]
const TEXT_RULES = [
  ['urgency', /\b(urgent(ly)?|immediately|within (24|48) ?hours|today itself|last (date|chance|warning)|final (notice|reminder)|act now|expire[sd]? (today|soon))\b/i, 12,
    'Creates urgency or a deadline to rush you'],
  ['threat', /\b(suspend(ed)?|blocked|deactivat|cancel(led)? (your )?(registration|licen[cs]e)|legal action|penalty|arrest|fir\b|warrant|blacklist)/i, 14,
    'Threatens suspension, penalty or legal action'],
  ['digital_arrest', /\b(digital arrest|cbi|narcotics|customs (department|officer)|enforcement directorate|ed officer|cyber ?cell officer|money laundering case|parcel (seized|contains))\b/i, 40,
    'Looks like a "digital arrest" / fake-officer scam - real agencies never do this over video call or WhatsApp'],
  ['ngo_compliance', /\b(fcra|12a|12ab|80g|csr[- ]?1|ngo ?darpan|niti aayog|darpan id)\b/i, 0, null], // context only
  ['fee_for_grant', /\b(processing|registration|application|verification|documentation|release|clearance|stamp|legal|insurance|transfer)\s*(fee|charge|charges|amount|deposit)\b/i, 22,
    'Asks for a fee to release a grant, donation or approval - genuine funders never charge this'],
  ['grant_bait', /\b(grant|donation|csr fund(s|ing)?|funding)\b.*\b(approved|sanctioned|selected|won|awarded|released)\b|\b(approved|sanctioned|selected)\b.*\b(grant|donation|csr fund)/i, 10,
    'Unsolicited "your grant/CSR funding is approved" message'],
  ['lottery', /\b(lottery|lucky draw|jackpot|you have won|winner|prize money|kbc|reward points? (expire|redeem))\b/i, 22,
    'Prize, lottery or reward bait'],
  ['kyc', /\b(kyc|pan (card )?(update|link|block)|aadhaa?r (update|link|verify)|re-?kyc|update your (bank|account) details)\b/i, 18,
    'Asks you to "update KYC" or bank/PAN/Aadhaar details via a link or call'],
  ['otp', /\b(otp|one[- ]time password|verification code|cvv|upi pin|m-?pin|net ?banking password)\b/i, 22,
    'Mentions OTP / PIN / CVV - never share these with anyone'],
  ['upi_collect', /\b(collect request|scan (this|the) qr|qr code to receive|approve the request to receive|receive money.*(pin|scan))\b/i, 25,
    'UPI trick - you never need to scan a QR or enter a PIN to RECEIVE money'],
  ['remote_access', /\b(anydesk|teamviewer|quick ?support|rustdesk|screen ?share|install (this|the) app|\.apk\b)/i, 25,
    'Asks you to install an app or give remote/screen access'],
  ['odd_payment', /\b(gift ?cards?|google play cards?|amazon pay (voucher|card)|bitcoin|crypto|usdt|western union|moneygram)\b/i, 25,
    'Asks for payment via gift cards, crypto or wire services'],
  ['secrecy', /\b(do not (tell|share|inform)|keep (this|it) (confidential|secret)|don'?t tell anyone)\b/i, 12,
    'Asks you to keep it secret'],
  ['ceo_fraud', /\b(are you (free|available)|i('?m| am) in a meeting|can'?t talk (now|right now)|need a (small |quick )?favou?r|buy (some )?gift cards)\b/i, 20,
    'Classic "boss/director is in a meeting, needs a favour" impersonation'],
  ['job_task', /\b(part[- ]time job|work from home.*(earn|₹|rs)|like (youtube )?videos? and earn|daily (income|earning)|task[- ]based|telegram (group|task))\b/i, 18,
    'Task / part-time job scam pattern'],
  ['credential', /\b(verify your (account|email|password)|login to (avoid|prevent)|confirm your (password|identity)|mailbox (full|quota)|password (expires|expir))\b/i, 18,
    'Asks you to log in or confirm your password'],
  ['gov_impersonation', /\b(income tax (department|officer)|mca|ministry of home affairs|mha|trai|electricity (board|bill).*(disconnect|cut))\b/i, 8,
    'Claims to be from a government body - verify only on the official .gov.in site'],
  ['bad_money', /\b(refund of|cashback of|you will receive)\s*(₹|rs\.?|inr)\s?[\d,]+/i, 8,
    'Promises money you were not expecting'],
];

const SHORTENERS = /^(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|cutt\.ly|rb\.gy|ow\.ly|shorturl\.at|tiny\.cc|rebrand\.ly|t\.ly|s\.id|bit\.do|surl\.li|shorturl\.asia|wa\.link)$/i;
const RISKY_TLDS = /\.(xyz|top|click|link|online|site|live|buzz|icu|rest|shop|club|monster|cfd|sbs|cyou|quest|cam|work|loan|win|bid|gq|ml|cf|tk|ga|zip|mov)$/i;
const BRANDS = ['sbi', 'hdfc', 'icici', 'axis', 'kotak', 'paytm', 'phonepe', 'gpay', 'npci', 'incometax', 'uidai', 'aadhaar',
  'fcra', 'ngodarpan', 'darpan', 'mca', 'epfo', 'indiapost', 'amazon', 'flipkart', 'microsoft', 'office365', 'outlook',
  'google', 'paypal', 'whatsapp', 'gov', 'nic', 'rbi', 'sebi', 'irctc', 'bescom', 'mahadiscom'];
const OFFICIAL_SUFFIX = /(\.gov\.in|\.nic\.in|\.gov|\.rbi\.org\.in)$/i;
const FREE_MAIL = /@(gmail|yahoo|outlook|hotmail|rediffmail|proton(mail)?|ymail|aol|zoho|mail|gmx)\.(com|in|co\.in|me)$/i;

function extractUrls(text) {
  const out = new Set();
  const re = /\b((?:https?:\/\/|www\.)[^\s<>"'()]+|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|in|org|net|co|xyz|top|click|link|online|site|live|info|io|me|ly|gd|gl|at|shop|club|app)(?:\/[^\s<>"']*)?)/gi;
  let m;
  while ((m = re.exec(text)) && out.size < 15) {
    let u = m[1].replace(/[.,;:!?)\]]+$/, '');
    if (/@/.test(text.slice(Math.max(0, m.index - 1), m.index))) continue; // part of an email
    if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
    out.add(u);
  }
  return [...out];
}

function checkUrl(raw) {
  const flags = [];
  let score = 0;
  let host = '';
  try {
    const u = new URL(raw);
    host = u.hostname.toLowerCase();
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) { score += 25; flags.push('Link points to a raw IP address instead of a website name'); }
    if (host.startsWith('xn--') || host.includes('.xn--')) { score += 25; flags.push('Link uses look-alike (punycode) characters'); }
    if (SHORTENERS.test(host)) { score += 12; flags.push('Shortened link hides the real destination'); }
    if (RISKY_TLDS.test(host)) { score += 15; flags.push('Uses a domain ending often abused by scammers (' + host.split('.').pop() + ')'); }
    if (u.username) { score += 20; flags.push('Link contains "@" which can disguise the real site'); }
    if (host.split('.').length > 4) { score += 8; flags.push('Unusually long sub-domain chain'); }
    if ((host.match(/-/g) || []).length >= 3) { score += 8; flags.push('Many hyphens in the domain name'); }
    const label = host.replace(/^www\./, '');
    const brand = BRANDS.find((b) => label.replace(/[-.]/g, '').includes(b));
    if (brand && !OFFICIAL_SUFFIX.test(host) && !new RegExp('(^|\\.)' + brand + '\\.(com|in|co\\.in|org|org\\.in)$').test(host)) {
      score += 22; flags.push('Mentions "' + brand + '" but is not that organisation\'s official domain');
    }
    if (/(gov|govt|india|ministry)[-.]?(in|india)?/.test(label) && !OFFICIAL_SUFFIX.test(host)) {
      score += 18; flags.push('Looks government-related but is not a .gov.in / .nic.in site');
    }
    if (/\.(apk|exe|scr|bat|msi|js)(\?|$)/i.test(u.pathname)) { score += 30; flags.push('Link downloads an app or program file'); }
    if (/(login|verify|kyc|update|secure|account|wallet|claim|reward|refund)/i.test(u.pathname + u.search) && score > 0) {
      score += 6;
    }
  } catch (e) {
    return null;
  }
  return { url: raw, host, score: clamp(score, 0, 100), flags };
}

function checkPhones(text) {
  const flags = [];
  let score = 0;
  const phones = text.match(/(?:\+|00)\d[\d\s-]{7,16}\d|\b\d{10}\b/g) || [];
  for (const p of phones.slice(0, 5)) {
    const d = p.replace(/[^\d+]/g, '').replace(/^00/, '+');
    if (d.startsWith('+') && !d.startsWith('+91')) {
      const known = { '+92': 'Pakistan', '+880': 'Bangladesh', '+84': 'Vietnam', '+62': 'Indonesia', '+254': 'Kenya',
        '+855': 'Cambodia', '+234': 'Nigeria', '+44': 'UK', '+1': 'US/Canada', '+971': 'UAE', '+60': 'Malaysia', '+95': 'Myanmar' };
      const pre = Object.keys(known).sort((a, b) => b.length - a.length).find((k) => d.startsWith(k));
      score += 15;
      flags.push('International number' + (pre ? ' (' + known[pre] + ')' : '') + ' - unusual for an Indian bank, govt office or funder');
    }
    if (/^(\+91)?140/.test(d)) { score += 6; flags.push('Number starts with 140 - telemarketing series'); }
  }
  return { score, flags, phones };
}

function checkSender(text) {
  const flags = [];
  let score = 0;
  const emails = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [];
  const claimsOfficial = /\b(government|ministry|department|officer|bank|income tax|fcra|niti aayog|csr (head|team)|foundation|trust)\b/i.test(text);
  for (const e of emails.slice(0, 5)) {
    const domain = e.split('@')[1].toLowerCase();
    if (FREE_MAIL.test(e) && claimsOfficial) {
      score += 15; flags.push('Claims to be an official body but writes from a free email (' + domain + ')');
    }
    const r = checkUrl('http://' + domain);
    if (r && r.score) { score += Math.round(r.score / 2); flags.push(...r.flags.map((f) => 'Sender domain: ' + f.toLowerCase())); }
  }
  return { score, flags };
}

function runRules(text) {
  const flags = [];
  let score = 0;
  const lower = text.toLowerCase();
  let hits = 0;
  for (const [id, re, w, msg] of TEXT_RULES) {
    if (re.test(lower)) {
      if (msg) { flags.push(msg); score += w; hits++; }
      if (id === 'ngo_compliance' && /(fee|pay|payment|link|click|suspend|cancel|penalty)/i.test(lower)) {
        score += 12; flags.push('Uses FCRA / 12A / 80G / Darpan compliance language together with a payment, link or threat');
      }
    }
  }
  if (hits >= 3) score += 15; // several independent signals reinforce each other

  const urls = extractUrls(text);
  const links = urls.map(checkUrl).filter(Boolean);
  for (const l of links) { score += l.score; flags.push(...l.flags); }

  const ph = checkPhones(text);
  score += ph.score; flags.push(...ph.flags);
  const se = checkSender(text);
  score += se.score; flags.push(...se.flags);

  return { score: clamp(score, 0, 100), flags: [...new Set(flags)], links };
}

/* ----------------------------------------------------- Google Safe Browsing */

async function safeBrowsing(key, urls) {
  if (!key || !urls.length) return [];
  try {
    const res = await fetch('https://safebrowsing.googleapis.com/v4/threatMatches:find?key=' + encodeURIComponent(key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: 'ngo-knowledge-hub', clientVersion: '1.0' },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: urls.slice(0, 10).map((url) => ({ url })),
        },
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.matches || []).map((m) => m.threat && m.threat.url).filter(Boolean);
  } catch (e) {
    return [];
  }
}

/* ----------------------------------------------------------------------- AI */

function buildPrompt(text, hasImage, ruleFlags, languageName) {
  return [
    'You are a fraud-prevention analyst for the NGO Knowledge Hub, a portal for Indian',
    'non-profit organisations run by Impact Foundation India. Staff of small NGOs paste',
    'messages they received (email, WhatsApp, SMS, call details, links, phone numbers)',
    'and ask if it is a scam. Common scams against Indian NGOs: fake grant / CSR funding',
    'approvals that ask for a "processing fee"; fake FCRA, 12A, 80G, CSR-1 or NGO Darpan',
    'notices; fake KYC/bank updates; digital-arrest calls by fake CBI/police/customs;',
    'UPI collect / QR tricks; impersonation of the NGO director asking for gift cards or',
    'urgent transfers; fake donors who "overpay" and ask for a refund; phishing logins.',
    '',
    hasImage ? 'The content is in the attached screenshot. Read all text in it first.' : '',
    'CONTENT TO CHECK',
    text || '(see screenshot)',
    '',
    'AUTOMATED CHECKS ALREADY FOUND',
    ruleFlags.length ? ruleFlags.map((f) => '- ' + f).join('\n') : '(none)',
    '',
    'Reply with ONE JSON object only, keys:',
    '"verdict": "scam" | "suspicious" | "likely_safe"',
    '"score": integer 0-100 (risk; 70+ scam, 35-69 suspicious, under 35 likely safe)',
    '"summary": 1-2 plain sentences explaining your judgement',
    '"flags": array of up to 6 short red flags you see (empty if none)',
    '"advice": array of 2-4 short, concrete next steps for an NGO staff member',
    '"extractedText": if a screenshot was given, the main text you read (max 600 chars), else ""',
    '',
    'Rules: be calibrated - ordinary messages with no request for money, data, login or',
    'urgency are likely_safe. Never invent phone numbers, websites or helplines except',
    'the real ones: cybercrime helpline 1930 and https://cybercrime.gov.in. Write the',
    'summary, flags and advice in ' + languageName + '.',
  ].filter((l) => l !== '').join('\n');
}

function parseLooseJson(t) {
  const s = str(t).trim().replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a !== -1 && b > a) {
    try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { /* ignore */ }
  }
  return null;
}

function unwrap(res, depth) {
  const d = depth || 0;
  if (res == null || d > 4) return null;
  if (typeof res === 'string') return parseLooseJson(res);
  if (typeof res !== 'object') return null;
  if (res.verdict) return res;
  for (const k of ['response', 'result', 'output_text', 'text', 'content']) {
    if (res[k] != null) return unwrap(res[k], d + 1);
  }
  if (Array.isArray(res.choices) && res.choices[0]) {
    const c = res.choices[0];
    return unwrap(c.message ? c.message.content : c, d + 1);
  }
  return null;
}

function splitDataUrl(dataUrl) {
  const m = /^data:(image\/(png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(str(dataUrl));
  return m ? { mime: m[1], b64: m[3] } : null;
}

async function runGemini(apiKey, model, prompt, image, signal) {
  const parts = [{ text: prompt }];
  if (image) parts.push({ inline_data: { mime_type: image.mime, data: image.b64 } });
  const generationConfig = { temperature: 0.2, maxOutputTokens: 1200, responseMimeType: 'application/json' };
  if (model.indexOf('gemini-2.5') === 0) generationConfig.thinkingConfig = { thinkingBudget: 0 };

  const res = await fetch(GEMINI_ROOT + '/' + model + ':generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig }),
    signal,
  });
  const raw = await res.text();
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + raw.slice(0, 200));
  const data = JSON.parse(raw);
  const text = ((data.candidates && data.candidates[0] && data.candidates[0].content.parts) || [])
    .map((p) => p.text || '').join('');
  const parsed = parseLooseJson(text);
  if (!parsed || !parsed.verdict) throw new Error('Gemini returned no verdict');
  return parsed;
}

async function runCloudflareVision(ai, prompt, image) {
  const bytes = Uint8Array.from(atob(image.b64), (c) => c.charCodeAt(0));
  const call = () => ai.run(CF_VISION_MODEL, {
    messages: [{ role: 'user', content: prompt }],
    image: [...bytes],
    max_tokens: 900,
    temperature: 0.2,
  });
  let res;
  try {
    res = await call();
  } catch (e) {
    // Meta's licence must be accepted once per account; do it and retry.
    if (/agree/i.test(str(e && e.message))) {
      await ai.run(CF_VISION_MODEL, { prompt: 'agree' }).catch(() => {});
      res = await call();
    } else throw e;
  }
  const parsed = unwrap(res);
  if (!parsed || !parsed.verdict) throw new Error('vision model returned no verdict');
  return parsed;
}

async function runCloudflareText(ai, model, prompt) {
  const res = await ai.run(model, {
    messages: [
      { role: 'system', content: 'You are a careful fraud analyst. Reply with a single JSON object and nothing else.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 800,
    temperature: 0.2,
  });
  const parsed = unwrap(res);
  if (!parsed || !parsed.verdict) throw new Error('no verdict');
  return parsed;
}

/* ------------------------------------------------------------------ merging */

function verdictFor(score) {
  return score >= 70 ? 'scam' : score >= 35 ? 'suspicious' : 'likely_safe';
}

const DEFAULT_ADVICE = {
  scam: [
    'Do not click links, call back, pay, or share OTP / bank / FCRA details.',
    'Verify independently using contact details from the official website - not the ones in the message.',
    'Report it at https://cybercrime.gov.in or call 1930 (National Cybercrime Helpline). If money was sent, call 1930 immediately.',
    'Warn your team and block the sender.',
  ],
  suspicious: [
    'Pause - do not pay or share any details yet.',
    'Confirm with the organisation directly using a phone number or email from its official website.',
    'Ask a colleague or your IT contact for a second opinion.',
  ],
  likely_safe: [
    'No strong scam signs found, but stay alert if they later ask for money, OTPs or logins.',
    'When in doubt, verify through an official channel you already trust.',
  ],
};

function merge(rules, ai, sbHits) {
  let score = rules.score;
  const flags = [...rules.flags];
  if (sbHits.length) {
    score = Math.max(score, 95);
    flags.unshift('Google Safe Browsing lists this link as dangerous');
  }
  let summary = '';
  let advice = [];
  let extractedText = '';
  if (ai) {
    const aiScore = clamp(Math.round(Number(ai.score)) || 0, 0, 100);
    // Rules catch hard evidence; AI catches context. Lean on whichever is more alarmed,
    // but let a confident "safe" from the AI soften weak rule hits.
    score = rules.score >= 40 ? Math.max(score, aiScore) : Math.round(score * 0.35 + aiScore * 0.65);
    if (sbHits.length) score = Math.max(score, 95);
    summary = str(ai.summary).trim();
    if (Array.isArray(ai.flags)) for (const f of ai.flags.slice(0, 6)) if (str(f).trim()) flags.push(str(f).trim());
    if (Array.isArray(ai.advice)) advice = ai.advice.map(str).filter(Boolean).slice(0, 4);
    extractedText = str(ai.extractedText).slice(0, 600);
  }
  score = clamp(score, 0, 100);
  const verdict = verdictFor(score);
  if (!summary) {
    summary = verdict === 'scam'
      ? 'This has several strong signs of a scam.'
      : verdict === 'suspicious'
        ? 'Some warning signs found. Verify before you act.'
        : 'No obvious scam signs were found.';
  }
  // Always end with the official reporting route for anything risky.
  if (!advice.length) advice = DEFAULT_ADVICE[verdict];
  else if (verdict !== 'likely_safe' && !advice.some((a) => /1930|cybercrime/.test(a))) {
    advice.push('Report it at https://cybercrime.gov.in or call 1930.');
  }
  // de-dupe flags case-insensitively
  const seen = new Set();
  const uniq = flags.filter((f) => { const k = f.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  return { verdict, score, summary, flags: uniq.slice(0, 10), advice, extractedText };
}

/* -------------------------------------------------------------------- route */

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  let payload;
  try { payload = await request.json(); } catch (e) { return json({ error: 'Expected JSON.' }, 400); }

  const text = str(payload && payload.text).trim().slice(0, MAX_TEXT);
  const imageRaw = str(payload && payload.image);
  if (imageRaw.length > MAX_IMAGE_CHARS) return json({ error: 'That image is too large. Try a smaller screenshot.' }, 413);
  const image = imageRaw ? splitDataUrl(imageRaw) : null;
  if (imageRaw && !image) return json({ error: 'Unsupported image. Use PNG, JPG or WebP.' }, 400);
  if (!text && !image) return json({ error: 'Paste a message, link or number, or add a screenshot.' }, 400);

  const languageName = resolveLanguage(payload && payload.language);
  const rules = runRules(text);
  const sbPromise = safeBrowsing(str(env && env.SAFE_BROWSING_KEY).trim(), rules.links.map((l) => l.url));
  const prompt = buildPrompt(text, !!image, rules.flags, languageName);

  const started = Date.now();
  const errors = [];
  let ai = null;
  let engine = 'rules';

  const apiKey = str(env && env.GEMINI_API_KEY).trim();
  if (apiKey) {
    const override = str(env && env.GEMINI_MODEL).trim();
    const models = override ? [override, ...GEMINI_MODELS.filter((m) => m !== override)] : GEMINI_MODELS;
    for (const model of models) {
      if (Date.now() - started > TIME_BUDGET_MS) break;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      try {
        ai = await runGemini(apiKey, model, prompt, image, ctrl.signal);
        engine = 'gemini:' + model;
        clearTimeout(timer);
        break;
      } catch (e) {
        clearTimeout(timer);
        errors.push('gemini/' + model + ': ' + str(e && e.message).slice(0, 120));
      }
    }
  }

  const cf = env && env.AI;
  if (!ai && cf && typeof cf.run === 'function') {
    if (image) {
      try { ai = await runCloudflareVision(cf, prompt, image); engine = 'workers-ai:vision'; }
      catch (e) { errors.push('workers-ai/vision: ' + str(e && e.message).slice(0, 120)); }
    }
    if (!ai) {
      for (const model of CF_TEXT_MODELS) {
        if (Date.now() - started > TIME_BUDGET_MS + 4000) break;
        if (!text) break; // text models cannot read a screenshot
        try { ai = await runCloudflareText(cf, model, prompt); engine = 'workers-ai:' + model; break; }
        catch (e) { errors.push('workers-ai/' + model + ': ' + str(e && e.message).slice(0, 120)); }
      }
    }
  }

  if (!ai && !text) {
    return json({ error: 'Could not read the screenshot right now. Please paste the text instead.', detail: errors.join(' | ') }, 502);
  }

  const sbHits = await sbPromise;
  const result = merge(rules, ai, sbHits);
  return json({
    ...result,
    links: rules.links.map((l) => ({ url: l.url, host: l.host, risky: l.score >= 15 || sbHits.includes(l.url) })),
    engine,
    aiUsed: !!ai,
  });
}
