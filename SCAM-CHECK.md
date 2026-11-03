# Scam Check (`/scam-check`)

A free "Is this a scam?" checker for NGOs. Visitors paste a message, link, phone number or sender
address, or upload a screenshot, and get a verdict (Likely a scam / Suspicious / No strong scam
signs), a 0-100 risk score, red flags, and next steps (cybercrime.gov.in, 1930, Sanchar Saathi).

## Files
- `functions/api/scam-check.js` - Pages Function: India/NGO rule engine + AI review
- `src/components/src/components/ScamChecker.tsx` - the page
- `App.tsx`, `Navbar.tsx`, `HeroSearch.tsx` - route, "Scam Check" nav button, home-page button
- `functions/_middleware.js` - body cap raised to 3 MB for this one route (screenshots)

## How it decides
1. **Rules (always on, free):** fake grant/CSR "processing fees", FCRA/12A/80G/Darpan threats,
   KYC/OTP/UPI-PIN requests, digital-arrest (fake CBI/customs), gift-card / boss impersonation,
   task-job scams, shortened links, raw-IP / punycode / risky-TLD links, brand look-alike domains,
   fake "gov" domains that are not .gov.in/.nic.in, foreign phone numbers, free-email "officials".
2. **AI:** Gemini (`GEMINI_API_KEY`, already used by /api/ask) reads text and screenshots.
   Falls back to Cloudflare Workers AI (`AI` binding) - Llama 3.2 Vision for screenshots,
   Llama 3.3 for text. If all AI is down, rules still return a result.
3. **Optional:** set `SAFE_BROWSING_KEY` (Google Safe Browsing v4) to check every link against
   Google's phishing/malware list.

## Cloudflare setup
Nothing new is required if `/api/ask` already works (same `GEMINI_API_KEY` and `AI` binding).
Optional: Pages > Settings > Variables and Secrets > add `SAFE_BROWSING_KEY`.

## Privacy
Nothing submitted is stored or logged by this function.
