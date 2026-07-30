# Design: Cargable Admin Dashboard

## Technical Approach

Build pnpm workspaces for deployed `frontend/` and `backend/`. Main Cargable provider-tests the database contract; this repository pins it, generates DTO validators, implements Hono, and builds Next.js. Every protected request fails closed after verified identity and current `admin_members` authorization.

## Architecture Decisions

| Decision | Choice and rationale | Alternatives considered |
|---|---|---|
| Workspace/contracts | `frontend`, `backend`, `packages/contracts`. Main Cargable owns a machine-readable `admin-dashboard/v1` schema and provider SQL tests. This repository records commit SHA, schema path, and digest; CI checks out that commit and generates/validates DTO validators with provenance. No registry or shared database definition is copied. Additive optional changes may remain v1; removals, changed meaning, or incompatible types require v2. | npm workspaces; npm package; locally authored shared contracts. |
| Backend | Hono TypeScript on Vercel’s Node runtime; its documented setup default-exports the app and suits the small read-only surface. | A second Next.js app duplicates rendering/build concerns; Next.js says Route Handlers are not a full backend replacement. Bare functions duplicate middleware/errors. |
| Browser topology | `admin.cargable.es/api/dashboard/*` uses a thin frontend Route Handler proxy and no browser CORS. The separate backend Vercel URL remains internet-reachable: CORS is not access control, so every proxied or direct request independently verifies JWT and authorization. Each project has its own Root Directory/environment. | Cross-origin browser calls increase browser auth surface; external rewrites cannot perform explicit token handling. |
| Security/operations | Zod validates request parameters, generated DTOs, and RPC responses. Sanitized errors and `private, no-store` prevent raw errors/data caching. The UI retains the last success, marks failures stale/unavailable, and refreshes every 300 seconds. An 8-second RPC timeout fails closed. JSON logs contain request ID, route, status, latency, contract SHA, and hashed subject—never tokens, PII, DTO bodies, or raw exceptions. Distributed rate limiting is excluded from MVP because no durable atomic provider is approved; it requires a separate hardening design. | CDN caching risks leakage; per-instance serverless limits are unreliable. |

## Identity and Data Flow

```text
Browser -> Next getClaims()/getUser() -> getSession() token only -> Hono
        -> verify bearer -> allowlisted RPC -> auth.uid()+admin_members -> aggregate
        <- generated DTO validation <- sanitized response <- UI
```

Frontend authorization requires successful `getClaims()` or server `getUser()`. Only afterward may `getSession()` extract the raw access token; session user data is never trusted. Hono re-verifies that bearer. It creates a Supabase client with the anon/publishable key plus the verified user token—never a service-role key—and invokes only allowlisted main-owned `SECURITY DEFINER` authorization/aggregate RPCs.

Every RPC MUST be owned by a dedicated `NOLOGIN` role granted only required table privileges, check `auth.uid()` against active `admin_members`, set a safe `search_path`, revoke public execution, grant execution only to `authenticated`, expose aggregate/redacted columns, and pass provider SQL tests. This is the privileged aggregate boundary without a full-bypass credential in dashboard infrastructure.

## Target File Tree

```text
package.json  pnpm-workspace.yaml
packages/contracts/{source.json,src/generated,src/index.ts,tests/}
backend/api/index.ts
backend/src/{app,config}.ts
backend/src/middleware/{identity,admin,errors}.ts
backend/src/routes/{authorization,business,invoices,operations}.ts
backend/src/services/cargable-rpc.ts
backend/tests/{unit,integration,contract}/
frontend/app/{login,(protected)/layout,(protected)/business/page,
  (protected)/invoices/page,(protected)/operations/page}.tsx
frontend/app/api/dashboard/[...path]/route.ts
frontend/src/{auth,api,reports}/
frontend/tests/{unit,integration,e2e}/
```

## Interfaces / Contracts

Read-only routes are `GET /v1/authorization` and `GET /v1/reports/{business|invoices|operations}?range={7d|30d|all}`. Generated v1 schemas define report fields and freshness/range-or-snapshot metadata; no local metric fields are invented. Operations failures contain only job type, age, and attempts. Other methods return sanitized `405`; errors expose only stable code and request ID.

## Testing Strategy

| Layer | Plan |
|---|---|
| Unit | Vitest: validators, range/snapshot UI, redaction, timeout. |
| Integration | Hono/Next handlers: spoofed cookies, stale/expired tokens, refresh, claims/session mismatch, and direct-origin anonymous, invalid-token, non-member, and revoked-member denials; methods, no-store, fail-closed dependencies. |
| Contract | CI checks out pinned SHA; generated consumers validate main fixtures and test-environment RPC results. Provider SQL tests must pass first. |
| E2E | Playwright: login, protected navigation, three reports, ranges/snapshots, empty/stale states, 300-second refresh, no mutation/raw data. |

Strict TDD remains conditional: only after runners are scaffolded and configuration enables it may implementation use RED-GREEN-REFACTOR.

## Threat Matrix

| Boundary | Applicability and reason |
|---|---|
| Documentation-like paths | N/A — no file execution. |
| Git repository selection | Applicable — CI permits one configured remote and detached SHA; rejects `git -C`, relative/absolute paths, and remote/ref overrides. RED: tampered provenance fails. |
| Commit state | N/A — no index/worktree operation. |
| Push state | N/A — no ref/remote mutation. |
| PR commands | N/A — no shell or PR automation. |

## Migration / Rollout

1. Main repository adds RPCs/schema/provider tests, then records a passing contract commit.
2. Dashboard pins that SHA, generates validators, and passes contract/security tests before backend deployment.
3. Deploy internet-reachable backend, then frontend; smoke/E2E precedes `admin.cargable.es` DNS.
4. Roll back deployments independently and restore the previous passing SHA/generated validators; retain main contracts until unused.

## Open Questions

None. Versions, deployment URLs, secret names, and log sink are task-time constants. Durable rate limiting is post-MVP hardening.
