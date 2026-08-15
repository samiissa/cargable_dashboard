import { build } from "esbuild";

/**
 * Vercel-only bundling step. `api/index.ts` is the checked-in, human-authored
 * entry point (see CLAUDE.md) — this never replaces it, it only produces a
 * deploy artifact from it.
 *
 * Why this exists: `@cargable/contracts` is deliberately raw, un-built
 * TypeScript (see CLAUDE.md — consumed as source everywhere else: `tsx`
 * locally, Next.js's bundler in the frontend). Vercel's Node.js Functions
 * runtime only does native TS type-stripping for files inside the function's
 * own Root Directory (`backend/`); `@cargable/contracts` lives outside it and
 * is reached only through the pnpm workspace symlink, so at request time
 * Node's plain ESM loader tries to import that raw `.ts` file directly and
 * fails with ERR_MODULE_NOT_FOUND. Bundling api/index.ts inlines the
 * workspace-local source (contracts) so nothing outside Root Directory is
 * resolved at runtime, while real npm dependencies stay external and are
 * installed normally by Vercel.
 */
await build({
  entryPoints: ["api/index.ts"],
  outfile: "api/handler.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  logLevel: "info",
  // Real npm packages: leave external, installed normally at runtime.
  // Everything else (workspace packages like @cargable/contracts) gets
  // inlined, which is the whole point of this bundle.
  external: ["hono", "hono/*", "@supabase/supabase-js", "zod"],
});
