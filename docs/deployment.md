# Deployment

The dashboard ships as **two independent Vercel projects** from this one repository, per
`openspec/changes/admin-dashboard/design.md` ("Browser topology", "Security/operations"):

| Project | Root Directory | Config file | Deploys |
|---|---|---|---|
| backend | `backend` | `backend/vercel.json` | Hono app on Vercel's Node runtime (`backend/api/index.ts`) |
| frontend | `frontend` | `frontend/vercel.json` | Next.js App Router UI, its own `/api/dashboard/*` proxy |

There is **no shared root `vercel.json`**. Each project is created separately in the Vercel
dashboard (or `vercel link`), pointed at this same Git repository, with its **Root Directory**
set to `backend` or `frontend` respectively. `vercel.json` cannot set the Root Directory itself —
that is a per-project setting, configured once when the project is created.

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

**Known discrepancy, called out deliberately, not silently fixed:** every workspace package's
`"build"` npm script (`backend`, `frontend`, `packages/contracts`) is `tsc --noEmit` — a
type-check gate, not a real build. That is correct and sufficient for `backend` (Vercel's Node
runtime bundles `backend/api/index.ts` itself; no separate bundle step is needed) and for
`packages/contracts` (consumed as raw TypeScript, never built). It is **not** sufficient for
`frontend`: `pnpm --filter @cargable/frontend build` alone would type-check but never run
`next build`, so the Next.js framework/output detection would find no `.next` output and the
deployment would fail. `frontend/vercel.json` therefore overrides `buildCommand` to invoke
`next build` directly (`pnpm --filter @cargable/frontend exec next build`) instead of the
package's own `build` script. `frontend/package.json`'s `"build": "tsc --noEmit"` is left
unchanged deliberately: the root `pnpm build` (`pnpm --recursive --if-present build`) stays a
fast, workspace-wide type-check gate for CI/local use, and does not start running a full Next.js
production build (which needs real Supabase/backend env vars to complete) as a side effect of
this deployment change.

Verified locally before writing this document:
- `pnpm --filter @cargable/backend build` → `tsc --noEmit`, exits 0.
- `pnpm --filter @cargable/frontend build` → `tsc --noEmit`, exits 0 (confirms the discrepancy above).
- `pnpm --filter @cargable/frontend exec next build` → succeeds standalone with placeholder env
  values, producing the expected route manifest (`/login`, `/business`, `/invoices`,
  `/operations`, `/api/dashboard/[...path]`, plus the auth `Proxy (Middleware)`).

Align each Vercel project's **Node.js Version** setting with CI (`.github/workflows/contract.yml`
runs Node 24); neither `vercel.json` pins a `functions.runtime` version, so the dashboard setting
is authoritative.

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
   - Confirm an unsupported method (e.g. `POST`) returns a sanitized `405`.
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
