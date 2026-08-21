# Adding the search box and the working AI assistant to GitHub

Six files. Two are new, four replace existing ones. Nothing else in the repo
changes, and no new setting is needed on Cloudflare — the `AI` binding and
`GEMINI_API_KEY` you already added for Auto-Translate are what this uses.

Upload them in **four batches**, because GitHub's uploader puts files in
whatever folder you opened. Open the link, drag the matching files from the
unzipped folder, then commit.

---

### Batch 1 — the AI endpoint (1 file)

Open: <https://github.com/diegodsouza89/NGO-HUB/upload/main/functions/api>

Drag in: `functions/api/ask.js`

Commit message: `Add /api/ask endpoint for the AI assistant`

---

### Batch 2 — shared search helper (1 file)

Open: <https://github.com/diegodsouza89/NGO-HUB/upload/main/src/components/src/lib>

Drag in: `src/components/src/lib/search.ts`

Commit message: `Add shared search and ranking helper`

---

### Batch 3 — the three components (3 files)

Open: <https://github.com/diegodsouza89/NGO-HUB/upload/main/src/components/src/components>

Drag in, all three together:

- `src/components/src/components/AskAi.tsx`
- `src/components/src/components/HeroSearch.tsx`
- `src/components/src/components/CategoryList.tsx`

Commit message: `Add hero search box and real AI assistant`

GitHub will say the last two are being replaced. That is correct.

---

### Batch 4 — the app shell (1 file)

Open: <https://github.com/diegodsouza89/NGO-HUB/upload/main/src/components/src>

Drag in: `src/components/src/App.tsx`

Commit message: `Mount the AI assistant on every public page`

---

## Then

Cloudflare rebuilds on its own — about 2 to 3 minutes. Reload
<https://ngo-hub.pages.dev> with **Ctrl+Shift+R** and check three things:

1. A search box now sits under the tagline. Type `grant` — results appear as
   you type. Enter opens the highlighted one.
2. The orange **AI** bubble at the bottom right opens a panel. Ask
   *"What are the FCRA compliance rules?"* and you should get a written answer
   plus a **Sources used** list of your own documents.
3. A green badge means the answer came from your documents. An amber badge
   means it is general AI knowledge and should be checked before you act on it.

## If the AI panel shows an error

Press **F12 → Network**, click the `/api/ask` row, and read `detail`:

| What it says | What it means |
| --- | --- |
| `404` on `/api/ask` | Batch 1 did not land in `functions/api/` |
| `GEMINI_API_KEY is not set` | The variable is missing on the Pages project |
| `no AI binding on this project` | The Workers AI binding is missing — add `AI` under Settings → Bindings |
| `exceeded your current quota` and it still answered | Normal. Gemini's daily free limit was reached, so Cloudflare's free model answered instead |
