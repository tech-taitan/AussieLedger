/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NOTE: GEMINI_MODEL_DEFAULT must match the literal exported as
 * `GEMINI_MODEL` from src/lib/ai.ts (Task 3). A test in Task 3 asserts
 * this equality so the two stay in sync. We avoid importing from src/
 * here because the server tsconfig only includes src/lib/migrations
 * and src/lib/schemas — pulling in src/lib/ai.ts would also pull React
 * (transitively through getCachedHealth's import chain).
 */
import express from 'express';

const GEMINI_MODEL_DEFAULT = 'gemini-3-flash-preview';

const GEMINI_URL = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

export function aiRouter(apiKey: string | undefined): express.Router {
  const router = express.Router();

  router.post('/ai/match-accounts', express.json({ limit: '5mb' }), async (req, res) => {
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(503).json({ error: 'ai-disabled', message: 'GEMINI_API_KEY not configured on server' });
    }
    const body = req.body as { prompt?: string; model?: string; responseSchema?: unknown };
    if (!body || typeof body.prompt !== 'string') {
      return res.status(400).json({ error: 'validation', message: 'Missing prompt' });
    }
    const model = body.model ?? GEMINI_MODEL_DEFAULT;
    try {
      const gres = await fetch(GEMINI_URL(model, apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: body.prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: body.responseSchema,
          },
        }),
      });
      const json = await gres.json();
      if (!gres.ok) {
        return res.status(gres.status).json({ error: 'gemini', details: json });
      }
      res.json(json);
    } catch (err) {
      res.status(502).json({ error: 'upstream', message: String(err) });
    }
  });

  return router;
}
