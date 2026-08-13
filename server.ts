import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: "10mb" }));

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Translation endpoint for admin article localization
app.post("/api/translate", async (req, res) => {
  try {
    const { title, body, targetLanguage } = req.body;

    if (!title || !body || !targetLanguage) {
      return res.status(400).json({ error: "Title, body, and targetLanguage are required" });
    }

    res.json({
      translatedTitle: title,
      translatedBody: body,
    });
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
