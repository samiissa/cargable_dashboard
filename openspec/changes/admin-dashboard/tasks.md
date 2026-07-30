# Tasks: Cargable Admin Dashboard

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimate | 1,100–1,500 |
| 400-line budget risk | High |
| Chained PRs | Yes |
| Suggested split | PR 1 contracts → PR 2 backend → PR 3 frontend |
| Strategy | ask-on-risk |
| Chain | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | PR | Test | Harness | Rollback |
|---|---|---|---|---|---|
| 1 | Validate contract DTOs | PR 1 | `pnpm --filter contracts test` | CI provenance checkout with pinned SHA | `packages/contracts/`, provenance CI |
| 2 | Secure BFF | PR 2 | `pnpm --filter backend test` | Direct backend requests: anonymous/member/revoked | `backend/` |
| 3 | Protected UI | PR 3 | `pnpm --filter frontend test:e2e` | Login, reports, refresh, stale state | `frontend/` |

## Phase 1: Contract Foundation

- [ ] 1.1 Add `package.json`, `pnpm-workspace.yaml`, test configuration, and workspace scripts for `packages/contracts/`, `backend/`, and `frontend/`.
- [ ] 1.2 RED: add `packages/contracts/tests/provenance.test.ts` proving altered SHA, schema path, digest, remote/ref, or path override is rejected.
- [ ] 1.3 Implement `packages/contracts/source.json`, generator, generated Zod exports, and `.github/workflows/contract.yml` allowing one configured remote and detached pinned SHA only.
- [ ] 1.4 Add contract fixture/RPC validation tests: v1 aggregate DTOs expose freshness/range-or-snapshot metadata and Operations exposes only job type, age, attempts.

## Phase 2: Secure Backend

- [ ] 2.1 RED: create `backend/tests/integration/identity.test.ts` for anonymous, spoofed-cookie, expired bearer, claims/session mismatch, non-member, revoked-member, and dependency failure; all deny sanitizedly.
- [ ] 2.2 Implement `backend/src/middleware/{identity,admin,errors}.ts` and `backend/src/config.ts`: re-verify JWT, check current membership, fail closed, emit stable code/request ID and `private, no-store`.
- [ ] 2.3 RED: add `backend/tests/unit/cargable-rpc.test.ts` for 8-second timeout, allowlist-only RPCs, invalid range, raw-response rejection, and redacted DTO validation.
- [ ] 2.4 Implement `backend/src/services/cargable-rpc.ts` using anon/publishable key plus verified bearer; never service role; log only request metadata and hashed subject.
- [ ] 2.5 RED: add `backend/tests/integration/routes.test.ts` for member GET authorization/reports, 405 mutations, unsupported metrics absent, snapshot fallback, terminal-only failures, and no-store responses.
- [ ] 2.6 Implement `backend/src/{app.ts,routes/authorization.ts,routes/business.ts,routes/invoices.ts,routes/operations.ts}` and `backend/api/index.ts` as default-exported, GET-only Hono routes.

## Phase 3: Protected Reporting UI

- [ ] 3.1 RED: add `frontend/tests/integration/auth-proxy.test.ts` proving protected pages/proxy deny absent or invalid sessions without data and forward a token only after `getClaims()`/`getUser()`.
- [ ] 3.2 Implement `frontend/src/auth/`, `frontend/app/login/page.tsx`, protected layout/pages, and `frontend/app/api/dashboard/[...path]/route.ts` as the same-origin token proxy.
- [ ] 3.3 RED: add `frontend/tests/unit/reports.test.tsx` for labels, unsupported metrics absent, ranges versus snapshots, empty versus stale/unavailable, terminal-detail redaction, and 300-second refresh.
- [ ] 3.4 Implement `frontend/src/{api,reports}/` and Business, Invoices, Operations pages with read-only presentation, last-success retention, freshness, and sanitized details.
- [ ] 3.5 Add `frontend/tests/e2e/dashboard.spec.ts`: authorized navigation through three reports; range/snapshot, empty/stale, refresh, and no mutation/raw-data assertions.

## Phase 4: Deployment Verification

- [ ] 4.1 Add `backend/vercel.json`, `frontend/vercel.json`, and deployment documentation for separate roots/environments; smoke backend before frontend and DNS.
- [ ] 4.2 Verify CI requires passing provider SQL tests before consumer contract tests; document independent deployment rollback and restoring prior SHA/generated validators.
