# Proposal: Cargable Admin Dashboard

## Intent

Deliver a secure, read-only dashboard at `admin.cargable.es` that replaces ad hoc inspection with evidence-backed Business, Invoices, and Operations reporting. Preserve the main Cargable repository as sole owner of shared Supabase contracts.

## Scope

### In Scope
- A `frontend/` Next.js, TypeScript, App Router application with verified Supabase SSR sessions.
- A server-only `backend/` API/BFF that authenticates every request, authorizes via `admin_members`, and returns aggregate/redacted DTOs.
- Read-only Business, Invoices, and Operations views with five-minute refresh.
- 7-day, 30-day, and all-time filters only with reliable timestamps; labelled snapshots otherwise.
- Sanitized terminal-failure details limited to job type, age, and attempts.

### Out of Scope
- Admin-management UI, writes, raw errors, payloads, PII, or browser service-role credentials.
- Monetary Platform Costs or unsupported DAU/WAU/MAU and historical revenue claims.
- Shared Supabase schema, migrations, `admin_members`, and aggregate contracts; these remain main-repository-owned.

## Capabilities

### New Capabilities
- `dashboard-authentication`: SSR session verification and server-side `admin_members` authorization.
- `dashboard-metrics-api`: Authenticated aggregate/redacted DTO contracts for Business, Invoices, and Operations.
- `dashboard-reporting-ui`: Reports, supported ranges, snapshot labels, sanitized drill-downs, and refresh.

### Modified Capabilities
None.

## Approach

First implement and verify shared database contracts in the main repository; then implement this repository's `backend/`; finally build `frontend/` against its API. Deploy each as a separate Vercel root project. Assume application/test tooling will be established later; none exists yet.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| Main Cargable repository | Modified | Shared contracts first. |
| `backend/` | New | Authenticated API/BFF. |
| `frontend/` | New | Reporting application. |
| Vercel projects | New | Separate roots. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Contract drift | Medium | Version and verify contracts first. |
| Privileged data exposure | Medium | Enforce backend authorization, redaction, and secret isolation. |
| Misleading metrics | Medium | Disclose denominators, timestamps, and snapshots. |

## Rollback Plan

Disable or revert each Vercel deployment and DNS independently. Revert consumers without removing shared contracts until confirmed unused.

## Dependencies

- Verified shared database aggregates and `admin_members` contract from the main Cargable repository.
- Supabase SSR authentication and separate Vercel project configuration.

## Success Criteria

- [ ] Only verified `admin_members` can access dashboard pages and API responses.
- [ ] Business, Invoices, and Operations metrics match verified aggregate contracts and disclose denominators/snapshot semantics.
- [ ] Refresh, supported ranges, redaction, and separate deployments work without exposing privileged credentials.
