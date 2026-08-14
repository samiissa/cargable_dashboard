# Tasks: Cargable Admin Dashboard

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimate | 1,100–1,500 |
| 400-line budget risk | High |
| Chained PRs | Yes |
| Suggested split | PR 1 contracts → PR 2 backend → PR 3 frontend |
| Delivery strategy | ask-on-risk |
| Chosen chain strategy | feature-branch-chain |

Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

Each PR is limited to 400 authored additions plus deletions. If PR 1 cannot remain within that limit, split `contract-foundation` into another feature-branch-chain child PR or obtain an explicit `size:exception`; an 800-line allowance does not replace this limit.

### Suggested Work Units

| Unit | Goal | PR | Test | Harness | Rollback |
|---|---|---|---|---|---|
| 1 | Contract and scaffold foundation | PR 1 | `pnpm --filter @cargable/contracts test` | N/A locally: this package validates files and fixtures; provider SQL runs in CI before consumer tests | PR 1 files listed below |
| 2 | Secure BFF | PR 2 | `pnpm --filter @cargable/backend test` | Direct backend requests: anonymous/member/revoked | `backend/` |
| 3 | Protected UI | PR 3 | `pnpm --filter @cargable/frontend test` | Login, reports, refresh, stale state once the harness exists | `frontend/` |

## Phase 1: Contract Foundation

- [x] 1.1 Add the initial pnpm workspace and package manifests, package test scripts, and the contracts Vitest configuration.
- [x] 1.2 Complete the scaffold baseline: add the reproducible lockfile, deliberately pin framework/tool versions, enable TypeScript strict mode, and add `typecheck`, `lint`, and `build` scripts where applicable.

### Provider Gate

Before provider-dependent contract work proceeds, the main Cargable repository MUST supply all of the following without dashboard-authored substitutes:

- [x] Approved provider remote: `git@github.com:samiissa/recargable.git`.
- [x] Detached commit SHA whose provider SQL tests pass: `bf5a2f6b4bf11c18cb7c3ed6c5a38ec604be3b55`.
- [x] Versioned machine-readable schema path: `supabase/contracts/admin-dashboard/v1/schema.json`.
- [x] Digest for that schema: `sha256:12565a69362b9e9ecd4d6d655e8b192ffd326a9f9db0cad22439104ac5ffaf26`.
- [x] Synthetic, non-identifying provider fixtures (14 fixtures under `supabase/contracts/admin-dashboard/v1/fixtures/{valid,invalid}/`).
- [x] Versioned aggregate RPC contract: `admin_dashboard_{authorization,business,invoices,operations}_v1`.
- [x] Passing provider SQL-test evidence: provider verify-report, 0 CRITICAL/0 WARNING, 9/9 deno tests, 14/14 fixtures cross-validated.

- [x] 1.3 RED: add `packages/contracts/tests/provenance.test.ts` proving altered remote, mutable ref or SHA, schema path, digest, and remote/ref/path overrides are rejected using synthetic provenance inputs.
- [x] 1.4 RED: add fixture and DTO validation tests for valid provider fixtures, generated-output drift, protected or unexpected field rejection, freshness and range-or-snapshot metadata, terminal Operations fields, and v1-compatible versus version-bumping changes. (`tests/contract-fixtures.test.ts`, `tests/generator.test.ts`)
- [x] 1.5 GREEN: implement the fixed-input provenance checker, committed `packages/contracts/source.json`, generator, and generated Zod schemas/DTO exports from the pinned provider contract; no hand-authored or widened fields. (`src/provenance.ts`, `src/generator.ts`, `src/generated/schema.ts`, `src/index.ts`, `scripts/generate-contracts.ts`)
- [x] 1.6 GREEN: add `.github/workflows/contract.yml` so CI checks out only the approved remote at the detached pinned SHA, verifies path and digest, runs provider SQL tests, checks generated output is unchanged, and only then runs `pnpm --filter @cargable/contracts test`.

### PR 1 Boundary

- [x] Focused test: `pnpm --filter @cargable/contracts test` — 30/30 passing (see apply-progress evidence table for the full RED/GREEN log). `pnpm --filter @cargable/contracts typecheck` and `lint` both exit 0.
- [x] Runtime harness: N/A because PR 1 validates static provenance, schemas, fixtures, and generated output and introduces no deployed runtime boundary; provider SQL execution is part of the CI gate (`.github/workflows/contract.yml`), not exercised locally in this repo.
- [x] Rollback: revert the exact PR 1 file list below as one unit; no unrelated changes.
- [x] Limit: total authored footprint (1.1–1.6) is ~639 lines, over the single-PR 400-line cap even excluding the generated golden file (91 lines). **`size:exception` approved by the maintainer on 2026-08-13** — PR 1 (`contract-foundation`) shipped as ONE PR (commit `a5fc986`, PR #1) instead of the feature-branch-chain split previously drafted here. Files: `.gitignore`, `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.mjs`, `packages/contracts/{package.json,tsconfig.json,vitest.config.ts,source.json}`, `packages/contracts/src/{provenance.ts,generator.ts,index.ts,generated/schema.ts}`, `packages/contracts/scripts/generate-contracts.ts`, `packages/contracts/tests/{scaffold-baseline,provenance,generator,contract-fixtures}.test.ts`, `.github/workflows/contract.yml`, `backend/package.json`, `frontend/package.json` — ~639 authored lines (excludes the 91-line generated golden file). The four-way sub-split previously drafted here was superseded by the size:exception and never shipped; this `size:exception` decision applies only to PR 1 and has no bearing on Phase 2/3 sizing, which is assessed fresh per phase.
- [x] Out of scope: backend/frontend production code, database schema or migrations, RPC implementation, real customer data, deployment configuration, and runtime or browser harnesses — confirmed untouched.

## Phase 2: Secure Backend

- [x] 2.1 RED: create `backend/tests/integration/identity.test.ts` for anonymous, spoofed-cookie, expired bearer, claims/session mismatch, non-member, revoked-member, and dependency failure; all deny sanitizedly.
- [x] 2.2 Implement `backend/src/middleware/{identity,admin,errors}.ts` and `backend/src/config.ts`: re-verify JWT, check current membership, fail closed, emit stable code/request ID and `private, no-store`.
- [x] 2.3 RED: add `backend/tests/unit/cargable-rpc.test.ts` for 8-second timeout, allowlist-only RPCs, invalid range, raw-response rejection, and redacted DTO validation.
- [x] 2.4 Implement `backend/src/services/cargable-rpc.ts` using anon/publishable key plus verified bearer; never service role; log only request metadata and hashed subject.
- [x] 2.5 RED: add `backend/tests/integration/routes.test.ts` for member GET authorization/reports, 405 mutations, unsupported metrics absent, snapshot fallback, terminal-only failures, and no-store responses.
- [x] 2.6 Implement `backend/src/{app.ts,routes/authorization.ts,routes/business.ts,routes/invoices.ts,routes/operations.ts}` and `backend/api/index.ts` as default-exported, GET-only Hono routes.

### PR 2 Boundary

- [x] Focused test: `pnpm --filter @cargable/backend test` — 26/26 passing (3 files: `tests/integration/identity.test.ts` 8/8, `tests/unit/cargable-rpc.test.ts` 10/10, `tests/integration/routes.test.ts` 8/8). `pnpm --filter @cargable/backend typecheck`, `lint`, and `build` all exit 0. Full workspace `pnpm typecheck`/`lint`/`build` also exit 0 (contracts 30/30 unaffected).
- [x] Runtime harness: in-process Hono `app.request(...)` integration tests exercise the real middleware chain (request context → identity → admin authorization → routing) with injected fake Supabase clients per CLAUDE.md's "inject network clients" testing rule; no network ports opened, no live Supabase project used.
- [x] Limit: **Authored footprint (tasks 2.1–2.6): ~904 lines** — production `backend/src/{app,config}.ts`, `backend/src/{middleware,routes,services,lib}/*.ts`, `backend/api/index.ts`, `backend/vitest.config.ts` (~464 lines) + tests `backend/tests/{integration,unit}/*.test.ts` (~432 lines) + `backend/package.json`/`packages/contracts/package.json` diffs (8 lines), over the single-PR 400-line cap (`openspec/config.yaml` `workflow.review.line_budget: 400`) by more than 2x (`pnpm-lock.yaml`'s diff excluded as machine-generated, per the PR 1 precedent). **`size:exception` approved by the maintainer on 2026-08-13** — PR 2 (`secure-backend`) ships as ONE PR instead of the `backend-identity-and-errors` → `backend-rpc-service` → `backend-routes-and-app` sub-split previously drafted here. This decision applies only to PR 2 and has no bearing on Phase 3 sizing, which is assessed fresh.
- [x] Rollback: revert `backend/` (all files) plus the `backend/package.json` and `packages/contracts/package.json` dependency/exports additions as one unit; `packages/contracts/src/**` and `packages/contracts/tests/**` are untouched.
- [x] Out of scope: `frontend/`, database schema/migrations, RPC implementation (owned by the main Cargable repository), real customer data, and deployment configuration — confirmed untouched.

## Phase 3: Protected Reporting UI

- [ ] 3.1 RED: add `frontend/tests/integration/auth-proxy.test.ts` proving protected pages/proxy deny absent or invalid sessions without data and forward a token only after `getClaims()`/`getUser()`.
- [ ] 3.2 Implement `frontend/src/auth/`, `frontend/app/login/page.tsx`, protected layout/pages, and `frontend/app/api/dashboard/[...path]/route.ts` as the same-origin token proxy.
- [ ] 3.3 RED: add `frontend/tests/unit/reports.test.tsx` for labels, unsupported metrics absent, ranges versus snapshots, empty versus stale/unavailable, terminal-detail redaction, and 300-second refresh.
- [ ] 3.4 Implement `frontend/src/{api,reports}/` and Business, Invoices, Operations pages with read-only presentation, last-success retention, freshness, and sanitized details.
- [ ] 3.5 Add `frontend/tests/e2e/dashboard.spec.ts`: authorized navigation through three reports; range/snapshot, empty/stale, refresh, and no mutation/raw-data assertions.

## Phase 4: Deployment Verification

- [ ] 4.1 Add `backend/vercel.json`, `frontend/vercel.json`, and deployment documentation for separate roots/environments; smoke backend before frontend and DNS.
- [ ] 4.2 Document independent deployment rollback and restoring the prior passing SHA/generated validators; the provider-before-consumer CI requirement is already enforced in PR 1 task 1.6.
