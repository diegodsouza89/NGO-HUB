# NGO Knowledge Hub — fixing translations, content and deployment

This explains three bugs that were found on the live site and exactly how to fix them.

---

## What was actually broken

**1. "Auto-Translate with AI" never translated anything.**
In `server.ts` the endpoint was a placeholder that handed your English text straight
back:

```js
res.json({
  translatedTitle: title,   // the English title
  translatedBody: body,     // the English body
});
```

Gemini was listed as a dependency but never called. Even when the server was
running, the button copied English into the Hindi / Bengali / Tamil fields.

**2. On Netlify the endpoint did not exist at all.**
This app is an Express + Vite app that needs a Node server (`npm run start`,
health check at `/api/health`, plus a `render.yaml` — it was built for Render).
Netlify serves it as a static site, so nothing answers `/api/translate` and it
returned **404**. The browser then tried to parse Netlify's HTML error page as
JSON, producing `Unexpected token '<', "<!DOCTYPE"... is not valid JSON`.

**3. Visitors only ever saw one article.**
All content lived in each browser's `localStorage`. The repo seeded exactly one
category and one article, so that is all a real visitor ever got. The 22 articles
and 11 categories in the admin portal existed **only in the one browser that
created them**.

**Plus:** the repo could not build. `src/App.tsx` imports `./lib/storage`, but
`src/lib/storage.ts` does not exist — the only complete copy of the app is at
`src/components/src/`. So GitHub was not building the live site.

---

## The fix — files to put in the repo

| File in repo | Action |
| --- | --- |
| `netlify.toml` | **new** — build settings, `/api/*` routing, SPA fallback |
| `netlify/functions/translate.mjs` | **new** — real Gemini translation endpoint |
| `src/components/src/data/content.json` | **new** — all 22 articles + 11 categories |
| `src/components/src/data/initialData.ts` | replace — reads `content.json` |
| `src/components/src/lib/syncRepoContent.ts` | **new** — keeps visitors' copies fresh |
| `src/components/src/main.tsx` | replace — calls `syncRepoContent()` on startup |
| `index.html` | replace — points at the one complete copy of the app |
| `tsconfig.json` | replace — adds `resolveJsonModule` for the JSON import |
| `server.ts` | replace — real translation instead of the placeholder |

---

## Step 1 — upload the files to GitHub

1. Go to <https://github.com/diegodsouza89/NGO-HUB>
2. **Add file → Upload files**
3. Drag the files in. To place a file inside a folder, type the folder path into
   the filename box first (for example `netlify/functions/`), or upload to the
   root and use **Add file → Create new file** with the full path.
4. Write a commit message such as `Fix translation endpoint and move content into repo`
5. **Commit changes**

> `content.json` is the file that was exported from your admin portal. It contains
> your 22 articles and 11 categories and no user records.

## Step 2 — set up Netlify

In your Netlify site → **Site configuration**:

1. **Build & deploy → Continuous deployment** — make sure the site is linked to
   the `diegodsouza89/NGO-HUB` repository, branch `main`. *If it is not linked,
   pushes to GitHub will never reach the live site.*
2. Build command: `npm run build` · Publish directory: `dist` ·
   Functions directory: `netlify/functions`
   (`netlify.toml` sets all three, so you can leave the dashboard fields empty.)
3. **Environment variables → Add a variable**
   - Key: `GEMINI_API_KEY`
   - Value: your key from <https://aistudio.google.com/apikey>
4. **Deploys → Trigger deploy → Clear cache and deploy site**

## Step 3 — check it worked

- Open the site in a **private / incognito window** (this is the only honest test —
  a normal window still has the old content cached). You should see all 11
  categories and 22 articles.
- Go to `/staff` → edit any article → pick a language tab → **Auto-Translate**.
  The fields should fill with real translated text, not English.
- If something fails, open **F12 → Console** and **Network** and look at the
  `/api/translate` request. `404` means the function was not deployed; `500` with
  a message about `GEMINI_API_KEY` means step 2.3 was missed.

---

## Adding or editing articles from now on

`src/components/src/data/content.json` is the source of truth. Edit it on GitHub,
commit, and Netlify rebuilds — every visitor sees the change on their next visit.

The file is one JSON object:

```jsonc
{
  "categories": [
    {
      "id": "cat-9641",
      "slug": "monitoring-evaluation-and-data",
      "icon": "FileBarChart",
      "order": 11,
      "names":        { "en": "Monitoring, Evaluation & Data", "hi": "...", "bn": "..." },
      "descriptions": { "en": "Tools to track programme outcomes.",  "hi": "...", "bn": "..." }
    }
  ],
  "articles": [
    {
      "id": "art-93861",
      "slug": "monitoring-evaluation-and-data",
      "categoryId": "cat-9641",
      "published": true,
      "resourceType": "toolkit",
      "sector": "General NGO",
      "tags": ["ngo-resource"],
      "updatedAt": "2026-08-18",
      "views": 1,
      "titles": { "en": "Monitoring, Evaluation & Data", "hi": "...", "bn": "..." },
      "bodies": { "en": "### Heading\n\nMarkdown body...", "hi": "...", "bn": "..." }
    }
  ]
}
```

Language keys are `en`, `hi`, `mr`, `ta`, `te`, `bn`, `gu`, `kn`. Any language you
leave out falls back to English automatically — that is why untranslated articles
show in English rather than showing a blank page.

**Important:** because the repo is now authoritative, content edited in the `/staff`
admin portal is local to that browser and gets overwritten whenever `content.json`
changes. Use the admin portal to draft and preview; commit to GitHub to publish.

### Exporting admin-portal edits back into content.json

If you have drafted content in the admin portal and want it in the repo, open the
site, press **F12 → Console**, paste this, and press Enter. It downloads a fresh
`content.json` that you can upload to GitHub.

```js
(() => {
  const payload = {
    categories: JSON.parse(localStorage.getItem('ngo_categories') || '[]')
      .sort((a, b) => (a.order || 0) - (b.order || 0)),
    articles: JSON.parse(localStorage.getItem('ngo_articles') || '[]')
      .sort((a, b) => String(a.id).localeCompare(String(b.id))),
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  );
  a.download = 'content.json';
  a.click();
  console.log(
    `Exported ${payload.categories.length} categories, ${payload.articles.length} articles.`
  );
})();
```

---

## Known limits

- **Netlify's free plan caps a function at 10 seconds.** Very long articles may
  time out; you will get a clear "Translation timed out" message rather than a
  silent failure. Workarounds: set `GEMINI_MODEL=gemini-2.0-flash` in Netlify's
  environment variables for a faster model, split the article into shorter
  sections, or deploy to Render using the existing `render.yaml` where the Express
  server runs with no such limit.
- **Analytics, users, tickets and bookmarks still live in `localStorage`.** They
  are per-browser and are not shared between visitors. Making those real needs a
  database (Supabase, Neon or Turso would all work) — a separate piece of work.
- **The repo still contains duplicate copies of the app** at `src/` and
  `src/components/`. They are incomplete and unused. `index.html` deliberately
  points past them. Deleting them is safe cleanup for later, but was left alone
  here to keep this change small.
