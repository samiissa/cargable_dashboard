# Cargable Dashboard Engineering Rules

This repository contains a security-sensitive, read-only administration dashboard. Implement the smallest change that satisfies the active OpenSpec requirements while preserving the architectural and data-ownership boundaries below.

## Agents (context-based auto-load)

IMPORTANT: When you detect any of these contexts, read the corresponding file BEFORE writing any code.

┌────────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────┐
│                                    Context                                     │               Read this file               │
├────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Flutter / Dart — widgets, Cubits, features/, .dart files                       │ ~/Proyectos/ai-artefacts/flutter/AGENT.md  │
├────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────┤
│ Supabase — migrations, Edge Functions, RLS, supabase/, .sql, .ts in functions/ │ ~/Proyectos/ai-artefacts/supabase/AGENT.md │
└────────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────┘

Both can apply at once when the work touches both layers.

If any of these files doesn't exist or can't be read, STOP and inform the user before continuing. Don't assume the conventions — wait until the file is available.

## Sources of Truth

Read these before implementing a change:

1. The active specifications under `openspec/changes/admin-dashboard/specs/` define required behavior.
2. `openspec/changes/admin-dashboard/design.md` defines the approved architecture and security model.
3. `openspec/changes/admin-dashboard/tasks.md` defines implementation order and verification work.
4. This file defines repository-wide implementation constraints.

When these sources disagree, do not guess. Stop implementation, identify the conflict, and update the appropriate OpenSpec artifact before changing code.

## Repository Boundaries

| Area | Responsibility | Must not own |
|---|---|---|
| `packages/contracts/` | Pinned contract provenance, generated Zod schemas, DTO exports, contract tests | Hand-authored copies of shared database contracts |
| `backend/` | Hono API, identity verification, current admin authorization, RPC orchestration, response validation and redaction | UI rendering, database schema, migrations, service-role access |
| `frontend/` | Next.js App Router UI, Supabase SSR session handling, same-origin API proxy, report presentation | Business aggregates, authorization truth, direct privileged database access |
| Main Cargable repository | Supabase schema, migrations, `admin_members`, RPC definitions, provider SQL tests | Dashboard deployment and presentation |

Dependencies MUST flow toward contracts: `frontend` and `backend` may import `@cargable/contracts`; contracts MUST NOT depend on either application. `frontend` MUST NOT import backend implementation files or bypass the backend to obtain report data.

## Approved Stack

- Package manager and workspace: pnpm 10 workspaces.
- Language: TypeScript in strict mode; do not introduce JavaScript application files.
- Frontend: Next.js App Router and React, deployed from `frontend/` as its own Vercel project.
- Backend: Hono on Vercel's Node.js runtime, deployed from `backend/` as a separate Vercel project.
- Authentication and data access: Supabase SSR and `supabase-js` using the publishable/anon key plus the verified user's bearer token.
- Runtime validation: Zod at every external boundary.
- Unit and integration tests: Vitest.
- Browser tests: Playwright once the frontend test harness is scaffolded.

Pin framework and tool versions deliberately when scaffolding them. Do not add an alternative framework, package manager, test runner, state library, ORM, or validation library without an approved design change.

## TypeScript Rules

- Enable `strict` and keep production code free of type errors.
- Prefer inferred internal types and explicit types at exported or trust-boundary APIs.
- Do not use `any`, non-null assertions, or unchecked type casts to silence errors. Narrow `unknown` or validate it.
- Model finite domain values such as report names and ranges with literal unions or Zod enums, not arbitrary strings.
- Keep modules focused on one architectural responsibility. Extract shared code only when there is a real second consumer.
- Validate environment variables once in a server-only config module. Never read scattered `process.env` values throughout the application.
- Never expose a server-only environment variable through `NEXT_PUBLIC_*`.

## Contract Rules

- The main Cargable repository is the sole provider and owner of shared database contracts.
- Record the approved remote, detached commit SHA, schema path, and digest in `packages/contracts/source.json`.
- Generate consumer Zod schemas and DTO types from the pinned machine-readable contract. Do not manually invent, widen, or patch generated fields.
- Commit generated output together with its provenance so builds are reproducible.
- CI MUST reject mutable refs, remote overrides, path overrides, digest mismatches, and altered generated output.
- Provider SQL tests MUST pass before consumer contract tests.
- Additive optional changes may remain in `v1`; removals, incompatible types, or changed meaning require a new contract version.
- Treat every Supabase RPC response as `unknown` until the generated schema validates it.

## Security Rules

These rules are non-negotiable:

- Fail closed. If identity, membership, contract validation, configuration, or an upstream dependency cannot be verified, return no report data.
- Verify identity before using session data. On the frontend server, use `getClaims()` or server-side `getUser()` for trust; use `getSession()` only afterward when the raw access token is needed for forwarding.
- The Hono backend MUST independently verify every bearer token, including requests received from the frontend proxy.
- Authorize every protected page and every API request against the current active `admin_members` contract. Authentication alone is insufficient.
- Never use or introduce a Supabase service-role key in this repository. Use the publishable/anon key with the verified user's bearer token.
- Invoke only explicitly allowlisted aggregate RPCs. Never accept an RPC name, table name, column name, remote, ref, or filesystem path from request input.
- Expose only aggregate or contract-approved redacted DTOs. Never expose PII, raw payloads, raw exceptions, database errors, tokens, or credentials.
- Keep all reporting surfaces read-only. Unsupported methods MUST return a sanitized `405`; do not add mutations or administrator-management operations.
- Apply an 8-second timeout to dashboard RPC calls and return a sanitized failure when it expires.
- Set `Cache-Control: private, no-store` on protected pages, proxy responses, backend responses, and errors. Use `cache: "no-store"` for protected fetches and never opt protected Route Handlers into static caching.
- CORS is not authorization. The independently reachable backend MUST be secure when called directly.

## Backend Rules

- Build the application in `backend/src/app.ts`; keep `backend/api/index.ts` as the thin default-exported Vercel entry point.
- Organize cross-cutting request behavior as Hono middleware: request ID, identity, admin authorization, sanitized errors, no-store headers, and structured logging.
- Preserve the middleware order: request context and error handling, identity verification, authorization, then route handling.
- Expose only `GET /v1/authorization` and `GET /v1/reports/{business|invoices|operations}` with `range=7d|30d|all` where supported by the contract.
- Validate path parameters, query parameters, upstream payloads, and final response DTOs with Zod.
- Return stable machine-readable error codes and a request ID. Do not serialize caught exceptions.
- Logs MUST be structured JSON and include request ID, route, status, latency, contract SHA, and a one-way hashed subject when needed.
- Logs MUST NOT contain tokens, email addresses, PII, DTO bodies, query results, or raw exceptions.
- Keep Supabase/RPC access behind `backend/src/services/`; route handlers coordinate HTTP concerns and do not embed data-access logic.
- Do not implement per-instance in-memory rate limiting. Durable distributed rate limiting requires a separate design.

## Frontend Rules

- Use the App Router. Prefer Server Components; add `"use client"` only for browser state, timers, or user interaction that requires it.
- Protect report routes in the server-rendering path. A route guard or proxy is defense in depth, not a replacement for verification inside protected pages and Route Handlers.
- Keep `frontend/app/api/dashboard/[...path]/route.ts` as a thin same-origin proxy. It may verify the session, construct an allowlisted backend URL, forward the bearer token, and sanitize the response; it MUST NOT implement report business logic.
- Never forward arbitrary paths, methods, headers, or query parameters. Allowlist report routes and supported ranges.
- Fetch browser report data only through `/api/dashboard/*`; do not expose the backend deployment URL or access token to client application code.
- Render only fields from validated contract DTOs. Do not derive unsupported metrics or imply historical data when the contract provides a snapshot.
- Clearly distinguish registered users from active users and label paid subscriptions as entitlement snapshots.
- Do not display Platform Costs, DAU, WAU, MAU, historical revenue claims, raw payloads, raw errors, or PII.
- Offer `7d`, `30d`, and `all` only when reliable timestamps support those ranges; otherwise render a clearly labelled snapshot.
- Refresh open reports every 300 seconds. Retain the last successful result after a refresh failure and label it stale or unavailable.
- Distinguish loading, empty, stale, unavailable, unauthorized, and forbidden states.
- Operations failure details are limited to terminal failures with job type, age, and attempts.
- Preserve accessibility and responsive behavior. Interactive controls require keyboard support, visible focus, and semantic labels.

## Testing Rules

- Add behavior-first tests at the boundary where a regression would be observed. Avoid tests that only mirror implementation details.
- Use Vitest for contract, backend, and frontend unit/integration tests; use Hono's in-process request or test client rather than opening network ports.
- Add Playwright coverage for complete browser authentication and reporting flows once its harness exists.
- Security-sensitive changes MUST include negative tests before they are considered complete.
- Contract tests MUST cover provenance tampering, generated-schema drift, valid provider fixtures, and rejection of protected or unexpected fields.
- Backend tests MUST cover anonymous, invalid/expired token, spoofed cookie, claims/session mismatch, non-member, revoked member, dependency failure, invalid range, timeout, invalid upstream DTO, unsupported method, redaction, and no-store headers.
- Frontend tests MUST cover protected routing, proxy allowlists, token forwarding only after verification, report semantics, snapshot/range behavior, empty and stale states, redaction, and five-minute refresh.
- E2E tests MUST cover login, protected navigation, all three reports, range/snapshot behavior, refresh failure, and absence of mutation controls or raw data.
- Keep tests deterministic: inject clocks, network clients, and identity dependencies rather than relying on real time or production services.
- Strict TDD becomes mandatory only after the relevant runner and configuration are scaffolded. Once available, use RED-GREEN-REFACTOR for each listed task.

## Change Workflow

1. Read the active spec, design, and task for the affected capability.
2. Confirm the change stays within the relevant workspace boundary.
3. Add or update the smallest behavior-focused test that proves the requirement or regression.
4. Implement the smallest correct production change.
5. Run the affected package's tests, typecheck, lint, and build scripts when those scripts exist.
6. Run contract tests whenever a DTO, RPC integration, report field, or generated schema changes.
7. Review the diff for secret exposure, PII, raw errors, cacheability, writes, and unsupported metrics.
8. Update OpenSpec artifacts when behavior or an architectural decision changes.

Use workspace scripts rather than invoking tool binaries directly. Current available verification:

```bash
pnpm test
pnpm --filter @cargable/contracts test
pnpm --filter @cargable/backend test
pnpm --filter @cargable/frontend test
```

Some package scripts will fail until their dependencies and harnesses are scaffolded. Add `typecheck`, `lint`, `build`, and package-specific test scripts as part of scaffold work; after that, they are required for affected changes.

## Review and Delivery

- Keep changes reviewable and aligned with the 400 changed-line budget in `openspec/config.yaml`.
- The expected implementation order is contracts, backend, then frontend. Do not build consumers against an unverified provider contract.
- Ask before splitting work into chained pull requests when the budget is at risk.
- Keep implementation, tests, generated artifacts, and necessary documentation in the same reviewable work unit.
- Do not modify unrelated user changes in a dirty worktree.
- Do not commit secrets or real customer data. Test fixtures must be synthetic and non-identifying.

## Definition of Done

A change is complete only when:

- The active OpenSpec scenarios are satisfied.
- Architectural dependency and ownership boundaries remain intact.
- External input and output are runtime-validated.
- Identity and authorization failures expose no dashboard data.
- Protected responses are non-cacheable and errors are sanitized.
- Relevant automated tests pass, including negative security cases.
- Typecheck, lint, and build pass when configured.
- Operational behavior is observable without logging secrets or protected data.
- Documentation and contract provenance are updated when applicable.
