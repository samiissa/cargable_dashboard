# Deployment

The dashboard ships as **two independent Vercel projects** from this one repository, per
`openspec/changes/admin-dashboard/design.md` ("Browser topology", "Security/operations"):

| Project | Root Directory | Config file | Deploys |
|---|---|---|---|
| backend | `backend` | `backend/vercel.json` | Hono app on Vercel's Node runtime (`backend/api/index.ts`) |
| frontend | `frontend` | `frontend/vercel.json` | Next.js App Router UI, its own `/api/dashboard/*` proxy |

There is **no shared root `vercel.json`**. Each project is created separately (via `vercel link`
run from inside `backend/` and `frontend/`, or the dashboard), pointed at this same Git
repository, with its **Root Directory** set to `backend` or `frontend` respectively. Root Directory
is a per-project setting — set it once via the dashboard (Settings → General) or
`vercel project` API/CLI, not in `vercel.json`, which lives inside the directory it describes and
can't declare where that directory is.

Do not run `vercel curl`/`vercel deploy` unscoped from the repo root without `--project`/a linked
`.vercel/project.json` in cwd: if it can't unambiguously resolve a project it can silently offer to
create a **new**, unwanted combined `services`-style project and write a root `vercel.json` that
contradicts the two-project architecture above. If that happens, delete the stray project and
`vercel.json`.

The Vercel dashboard/frontend origin (`admin.cargable.es`) and the backend's own deployment URL
are two different origins by design: the frontend's Route Handler proxy (`frontend/app/api/dashboard/[...path]/route.ts`)
forwards requests server-side, and the browser never calls the backend directly or needs CORS.
Because the backend URL stays independently, internet-reachable, it re-verifies identity and
authorization on every request regardless of caller (design.md "CORS is not access control").

## Monorepo build settings (both projects)

Both apps import `@cargable/contracts`, which lives outside their Root Directory
(`packages/contracts/`). In each Vercel project's **Settings → General**, enable
**"Include source files outside of the Root Directory in the Build Step"** — without it, the
build container will not have `packages/contracts/` available and the install/build will fail
resolving the `@cargable/contracts` workspace dependency.

Vercel auto-detects this is a pnpm workspace (`pnpm-workspace.yaml`, `packageManager: pnpm@10.14.0`
in the root `package.json`) and runs `pnpm install --frozen-lockfile` by default; no
`installCommand` override is needed or set in either `vercel.json`.

`backend/vercel.json` and `frontend/vercel.json` each set an explicit `buildCommand` scoped to
that package by name (`pnpm --filter @cargable/backend build` / `pnpm --filter @cargable/frontend exec next build`)
so the correct app builds regardless of whether Vercel's build container's working directory is
the repo root or the project's Root Directory — `pnpm --filter` resolves the workspace by walking
up to `pnpm-workspace.yaml` either way.

Every workspace package's `"build"` npm script (`backend`, `frontend`, `packages/contracts`) is
`tsc --noEmit` — a type-check gate, not a real build. That's correct and sufficient for
`packages/contracts` (consumed as raw TypeScript, never built, everywhere it's imported from —
`tsx` locally, Next.js's own bundler in the frontend). It is **not** sufficient for `frontend`
(needs an actual `next build`, see below) or, differently, for `backend` (see "Backend: why a real
build step exists" below) — both projects therefore override `buildCommand` in their own
`vercel.json` rather than deploying with plain `tsc --noEmit`.

`frontend/vercel.json` overrides `buildCommand` to invoke `next build` directly
(`pnpm --filter @cargable/frontend exec next build`) instead of the package's own `build` script,
since `pnpm --filter @cargable/frontend build` alone would type-check but never produce `.next`
output. `frontend/package.json`'s `"build": "tsc --noEmit"` is left unchanged deliberately: the
root `pnpm build` (`pnpm --recursive --if-present build`) stays a fast, workspace-wide type-check
gate for CI/local use, and does not start running a full Next.js production build (which needs
real Supabase/backend env vars to complete) as a side effect of this deployment change.

Align each Vercel project's **Node.js Version** setting with CI (`.github/workflows/contract.yml`
runs Node 24); neither `vercel.json` pins a `functions.runtime` version, so the dashboard setting
is authoritative.

### Backend: why a real build step exists, and the exact function shape Vercel expects

Two things about `backend/`'s deploy are **not** optional zero-config defaults, both discovered
only by actually deploying (nothing here was exercised end-to-end before the DEV `admin_members`
test account existed to unblock the frontend e2e suite, which is what led to actually running a
real deploy for the first time):

1. **`@cargable/contracts` must be bundled in, not left as a workspace import.** Vercel's Node.js
   Functions runtime only does native TypeScript type-stripping for files inside the function's
   own Root Directory (`backend/`). `@cargable/contracts` is deliberately raw, un-built TypeScript
   living *outside* that directory, reached only through the pnpm workspace symlink — at request
   time Node's plain ESM loader tries to import that raw `.ts` file directly and fails with
   `ERR_MODULE_NOT_FOUND`. `backend/vercel.json`'s `buildCommand`
   (`pnpm --filter @cargable/backend build:vercel`, defined in `backend/package.json`) runs
   `tsc --noEmit` for a real type-check gate, then `backend/scripts/build-vercel.mjs` (esbuild)
   bundles `api/index.ts` into `api/handler.js`, inlining `@cargable/contracts`'s source while
   leaving real npm dependencies (`hono`, `@supabase/supabase-js`, `zod`) external — they're
   installed normally at runtime. `api/handler.js` is a **generated deploy artifact**, gitignored,
   never committed.
2. **`backend/api/index.ts` must export the raw Hono app, never wrapped in `hono/vercel`'s
   `handle()`.** Vercel's Node.js Functions runtime natively calls a fetch-style default export
   (`(request: Request) => Response | Promise<Response>`); a Hono app satisfies that directly.
   `handle()` targets an older calling convention — under it, Vercel invokes the export as a
   legacy `(req, res) => void` handler and silently discards the returned `Response`, hanging
   every request forever (confirmed live: `curl` never returned, and Vercel's own build log warned
   `default export returned a 'Response'... You likely meant the Web fetch-style API`). Do not
   reintroduce `handle()`.

`backend/vercel.json` also sets an explicit `rewrites` rule
(`{"source": "/(.*)", "destination": "/api/handler"}`) so every path (`/v1/authorization`,
`/v1/reports/*`) reaches that one bundled function — without it, Vercel returns a platform-level
`404` for anything other than the literal `/api/handler` path, since Hono's own router only sees
whatever path the platform routes to it.

Two settings are **not** in `vercel.json` and must be set once per project (dashboard, or
`vercel api /v9/projects/<name> -X PATCH -F <field>=<value>`, matching how Root Directory is set):
`outputDirectory: "."` (an unset/`public` default makes Vercel expect static output that a
Functions-only project never produces) and **do not** set the dashboard **Framework Preset** to
`Hono` — that opts into Vercel's own framework-aware build/typecheck path, which (as observed live)
can inject an ambient global that collapses `@types/node`'s conditional `Response` type to `{}`,
breaking `tsc --noEmit` with phantom `Property 'status' does not exist on type 'Response'` errors
unrelated to our code. Leave the backend project's Framework Preset **unset/Other**
(`"framework": null` in `backend/vercel.json`, matching the project setting).

## Environment variables

Names below are exactly what each app's config module validates at startup (`loadConfig` /
`loadDashboardConfig`); nothing here is invented. Both apps fail closed (throw) at request time if
a required variable is missing or malformed — an incomplete env config never falls back to a
default that could silently disable identity verification.

### backend project (`backend/src/config.ts`)

| Variable | Scope | Notes |
|---|---|---|
| `SUPABASE_URL` | server-only | The Supabase project URL that owns the pinned `admin-dashboard/v1` contract. |
| `SUPABASE_ANON_KEY` | server-only | The **publishable/anon** key. Never a service-role key — none is used anywhere in this repo. |

The allowlisted RPC names (`admin_dashboard_{authorization,business,invoices,operations}_v1`) and
the pinned contract SHA are **not** environment variables — they are compile-time constants in
`backend/src/services/cargable-rpc.ts` (`ALLOWLISTED_RPCS`) and `backend/src/config.ts`
(`CONTRACT_SHA`, sourced from `packages/contracts/source.json`). Do not add env vars for them.

### frontend project (`frontend/src/auth/config.ts`, `frontend/src/auth/public-config.ts`)

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public (browser-safe) | Same Supabase project as the backend's `SUPABASE_URL`. Inlined into the client bundle — publishable value only. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public (browser-safe) | The publishable/anon key. |
| `DASHBOARD_BACKEND_URL` | server-only | The backend project's own deployed URL. Read only by the server-side proxy Route Handler; never sent to the browser bundle (never prefix it `NEXT_PUBLIC_*`). |

Set `DASHBOARD_BACKEND_URL` to the backend project's **Production** deployment URL (its stable
alias), not a preview-deployment URL, so promoting a new backend deployment to Production does not
require a frontend redeploy or env var change.

## Deployment order

Matches `design.md` → Migration / Rollout, step 3 ("Deploy internet-reachable backend, then
frontend; smoke/E2E precedes `admin.cargable.es` DNS."):

1. **Backend first.** Create the backend Vercel project (Root Directory `backend`, the
   "include files outside root directory" toggle enabled), set `SUPABASE_URL` /
   `SUPABASE_ANON_KEY`, and deploy.
2. **Smoke-test the backend independently**, before creating or pointing the frontend at it, and
   before any DNS change:
   - `GET /v1/authorization` and each `GET /v1/reports/{business|invoices|operations}` against the
     backend's own `*.vercel.app` Production URL.
   - Confirm anonymous and invalid-bearer-token requests are denied with a sanitized `401`/`403`
     and no report data (CLAUDE.md: "the independently reachable backend MUST be secure when
     called directly" — this must hold even before the frontend exists).
   - Confirm an unsupported method (e.g. `POST`) returns a sanitized error. Anonymously this is a
     `401` (`UNAUTHENTICATED`), not `405` — identity middleware runs before route/method matching
     (CLAUDE.md: "Preserve the middleware order: ... identity verification, authorization, then
     route handling"), so an anonymous caller never reaches the method check. `405` needs a
     request that passes identity/authorization first; verifying it is covered by the backend's
     own integration tests (`backend/tests/integration/*.test.ts`), not this anonymous smoke test.
   - Confirm responses carry `Cache-Control: private, no-store`.
   This exercises the exact deployed artifact the frontend will proxy to; it is not covered by the
   in-process Vitest integration suite (`backend/tests/integration/*.test.ts`), which runs against
   `app.request(...)` in memory, not a live Vercel deployment.
3. **Frontend second**, only after step 2 passes. Create the frontend Vercel project (Root
   Directory `frontend`, same include-outside-root toggle), set `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `DASHBOARD_BACKEND_URL` (pointed at the backend project's
   confirmed URL from step 2), and deploy.
4. **Smoke-test the frontend** against its own `*.vercel.app` Production URL before any DNS
   change: login, protected redirect for unauthenticated visitors, and all three reports loading
   through `/api/dashboard/*` (per `frontend/tests/e2e/dashboard.spec.ts`, which already covers
   this against a local dev server — repeat the unauthenticated-redirect case at minimum against
   the real deployment; the authenticated scenarios there are `test.skip`ped pending a provisioned
   `admin_members` test account, a known pre-existing gap unrelated to this phase).
5. **DNS last.** Only after both smoke tests pass, point `admin.cargable.es` at the frontend
   project. Never assign `admin.cargable.es` to the backend project — the backend keeps its own
   Vercel-issued URL, matching the "Browser topology" decision (no browser CORS; the frontend
   proxy is the only same-origin path the browser uses).

## Rollback

Matches `design.md` → Migration / Rollout, step 4 ("Roll back deployments independently and
restore the previous passing SHA/generated validators").

### Backend and frontend roll back independently

Because they are separate Vercel projects, rolling one back never requires touching the other:

- **Backend rollback**: in the backend project, promote the last known-good deployment to
  Production (Vercel's Instant Rollback / "Promote to Production" on a prior deployment). Because
  `DASHBOARD_BACKEND_URL` points at the backend's stable Production alias (not a specific
  deployment URL), the frontend needs no redeploy or env var change.
- **Frontend rollback**: in the frontend project, promote the last known-good deployment to
  Production. The backend is untouched.

### Contract-related regression

If a post-deploy regression traces back to the pinned provider contract (e.g. a generated DTO no
longer matches what the deployed backend/frontend expects):

1. Identify the prior known-good values in `packages/contracts/source.json` (`remote`, `revision`,
   `schemaPath`, `digest`) from Git history — e.g. `git log -- packages/contracts/source.json`.
2. Restore those exact values, either with `git revert` of the offending commit or by manually
   resetting `source.json` to the prior pinned SHA/digest.
3. Regenerate the consumer schema from the restored pin:
   `node packages/contracts/scripts/generate-contracts.ts <path-to-the-provider's-checked-out-schema.json>`
   (the exact invocation `.github/workflows/contract.yml` uses after re-verifying the provider SQL
   tests at that SHA — see that workflow for the full checkout/verify sequence).
4. Run `pnpm --filter @cargable/contracts test` and confirm `git diff --exit-code -- packages/contracts/src/generated`
   is clean (no drift) — the same provider-before-consumer gate PR 1 added
   (`.github/workflows/contract.yml`, task 1.6) enforces this automatically on the revert PR/push;
   this is documentation of the manual recovery procedure, not new CI.
5. Redeploy backend, smoke-test it (see Deployment order, step 2), then redeploy frontend and
   smoke-test it, before considering the rollback complete. Database schema/migration rollback, if
   ever needed, is owned by the main Cargable repository, not this one — this repository only pins
   and regenerates from an already-passing provider commit.
