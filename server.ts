import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: "10mb" }));

const LANGUAGES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
  ta: "Tamil",
  te: "Telugu",
  bn: "Bengali",
  gu: "Gujarati",
  kn: "Kannada",
};

function resolveLanguage(input: string): string {
  const raw = String(input || "").trim();
  const byCode = LANGUAGES[raw.toLowerCase()];
  if (byCode) return byCode;
  const byName = Object.values(LANGUAGES).find(
    (name) => name.toLowerCase() === raw.toLowerCase()
  );
  return byName || raw;
}

function buildPrompt(title: string, body: string, languageName: string): string {
  return [
    `You are a professional translator localising a knowledge-base article for`,
    `Indian non-profit / NGO staff. Translate from English into ${languageName}.`,
    ``,
    `Rules — follow all of them:`,
    `1. Preserve the Markdown structure EXACTLY (headings, lists, **bold**, tables,`,
    `   code blocks, horizontal rules, line breaks).`,
    `2. Do NOT translate URLs, email addresses or code — copy them verbatim.`,
    `3. Keep product and programme names in Latin script (Google for Nonprofits,`,
    `   Microsoft 365, Canva, TechSoup, Goodstack, GitHub, AWS, Azure, Salesforce,`,
    `   Mailchimp, Zoom, Zoho, Cloudflare, Twilio, Adobe, 80G, 12A, FCRA, CSR, NGO).`,
    `4. Use clear, simple ${languageName} that non-technical NGO staff can follow.`,
    `5. Keep all numbers, currency amounts, percentages and dates unchanged.`,
    ``,
    `Return ONLY JSON matching the schema — no markdown fences, no explanation.`,
    ``,
    `--- TITLE (English) ---`,
    title,
    ``,
    `--- BODY (English, Markdown) ---`,
    body,
  ].join("\n");
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Translation endpoint for admin article localization.
//
// NOTE: this used to be a placeholder that echoed the English text straight
// back, which is why "Auto-Translate with AI" appeared to work but filled every
// language with English. It now actually calls Gemini.
app.post("/api/translate", async (req, res) => {
  try {
    const { title, body, targetLanguage } = req.body;

    if (!title || !body || !targetLanguage) {
      return res
        .status(400)
        .json({ error: "Title, body, and targetLanguage are required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error:
          "GEMINI_API_KEY is not set. Add it to .env.local (local) or to your " +
          "host's environment variables, then restart.",
      });
    }

    const languageName = resolveLanguage(targetLanguage);
    if (languageName === "English") {
      return res.json({ translatedTitle: title, translatedBody: body });
    }

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const generationConfig: Record<string, unknown> = {
      temperature: 0.2,
      maxOutputTokens: model.startsWith("gemini-2.5") ? 32768 : 8192,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          translatedTitle: { type: "STRING" },
          translatedBody: { type: "STRING" },
        },
        required: ["translatedTitle", "translatedBody"],
      },
    };
    if (model.startsWith("gemini-2.5")) {
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: buildPrompt(title, body, languageName) }],
            },
          ],
          generationConfig,
        }),
      }
    );

    const raw = await response.text();

    if (!response.ok) {
      let message = raw.slice(0, 300);
      try {
        message = JSON.parse(raw)?.error?.message || message;
      } catch {
        /* keep raw text */
      }
      return res.status(502).json({ error: `Gemini request failed: ${message}` });
    }

    const data = JSON.parse(raw);
    const candidate = data?.candidates?.[0];

    if (candidate?.finishReason === "MAX_TOKENS") {
      return res.status(502).json({
        error:
          "The article is too long to translate in one request. Split it into shorter sections.",
      });
    }

    const text: string = (candidate?.content?.parts || [])
      .map((p: { text?: string }) => p?.text || "")
      .join("")
      .trim()
      .replace(/^\s*```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "");

    if (!text) {
      return res.status(502).json({ error: "Gemini returned an empty translation." });
    }

    const parsed = JSON.parse(text);
    const translatedTitle = String(parsed.translatedTitle || "").trim();
    const translatedBody = String(parsed.translatedBody || "").trim();

    if (!translatedTitle || !translatedBody) {
      return res
        .status(502)
        .json({ error: "Gemini returned an incomplete translation." });
    }

    res.json({ translatedTitle, translatedBody });
  } catch (error: any) {
    console.error("Error in Translate API:", error);
    res.status(500).json({ error: "Translation failed", details: error.message });
  }
});

// Setup Vite or Static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Impact Help Center] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
