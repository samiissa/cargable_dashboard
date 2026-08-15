import { serve } from "@hono/node-server";

import { createApp } from "./src/app.js";

/**
 * Local-only Node runtime for `src/app.ts`. Vercel deploys through
 * `api/index.ts` (`hono/vercel`) instead — this file exists purely so the
 * backend can run outside Vercel while developing or exercising the
 * Playwright e2e suite locally. Never imported by production code.
 */
try {
  process.loadEnvFile(new URL("./.env.local", import.meta.url));
} catch {
  // .env.local is optional: CI/deploys get SUPABASE_URL/SUPABASE_ANON_KEY
  // from the platform instead of a local file.
}

const port = Number(process.env.PORT ?? 4000);

serve({ fetch: createApp().fetch, port }, (info) => {
  console.log(`[backend] listening on http://localhost:${info.port}`);
});
