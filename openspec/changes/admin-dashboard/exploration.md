## Exploration: admin-dashboard

### Current State

This standalone repository is intentionally empty of application code and test tooling. It will be a dashboard monorepo with `frontend/` for Next.js with TypeScript and App Router, and `backend/` for a server-only dashboard API/BFF. Vercel will deploy the applications from separate root directories, with the frontend exposed at `admin.cargable.es`.

This is a migration and validation of evidence from the main Cargable repository (Engram #1408, #1409, #1411, #1412, #1413, #1416), not a redesign of shared data ownership. The dashboard API/BFF is owned here, while shared Supabase schema, migrations, `admin_members`, and database contracts remain owned and delivered by the main Cargable repository.

The dashboard is an authenticated, read-only admin application. For the MVP, administrators will be manually added to and removed from a Cargable backend `admin_members` table; there is no admin-management UI. Every aggregate request needs server-side authentication and authorization; browser route guards alone are insufficient. The browser MUST NOT receive a Supabase service-role key. The backend boundary should expose only narrow aggregate or redacted DTOs.

MVP scope is Business, Invoices, and Operations:

| Area | Evidence-backed metric/behavior |
| --- | --- |
| Business | Registered users means non-deleted registered accounts, not DAU/WAU/MAU; activity telemetry does not exist. Active paid subscriptions use the current entitlement snapshot (`effective_plan = 'subscribed'`), not revenue or historical subscription events. |
| Invoices | Invoice status and channel counts require documented denominators; body-only invoices lack document files. |
| Operations | Terminal unresolved failures are queue rows with `queue_status = 'failed'` and `attempts >= max_attempts`; retryable failures stay separate. Queue state/latency, unresolved alerts, and monthly-report status are supported. |

The interface should refresh every five minutes. It should offer 7-day, 30-day, and all-time ranges only where reliable timestamps support them; current-state snapshots must be labelled as snapshots. Terminal-failure drill-down may show sanitized job type, age, and attempts, but no raw errors, payloads, or PII.

Platform Costs is deferred from the monetary MVP. Honest workload labels may be shown (for example, AI extraction requests, forwarded invoice jobs, or known invoice-document bytes) but must not be presented as vendor spend. Historical Gemini/AI monetary cost is impossible to reconstruct: resolved model, tokens, and retry-attempt usage were not persisted. A future estimate requires a prospective append-only per-request usage ledger plus a versioned price catalog; actual provider spend requires validated billing exports or APIs.

### Affected Areas

- `openspec/changes/admin-dashboard/exploration.md` — migrated exploration artifact in this repository.
- `frontend/` — future Next.js dashboard application and verified Supabase SSR session handling.
- `backend/` — future server-only dashboard API/BFF; no shared schema ownership.
- Main Cargable repository — shared Supabase migrations, manual `admin_members` lifecycle, database aggregate contracts, and any AI usage-ledger work.
- `openspec/config.yaml` — records the monorepo and ownership boundaries.

### Approaches

1. **Dashboard monorepo with contract-first delivery (recommended)** — Keep dashboard frontend and API/BFF together under `frontend/` and `backend/`, while the main Cargable repository remains the sole owner of shared Supabase migrations and database contracts.
   - Pros: cohesive dashboard delivery; explicit server boundary; one source of truth for shared schema; avoids client-side privileged access. The Cargable database contract is implemented and verified first.
   - Cons: Requires explicit dependency tracking and coordinated releases between the dashboard monorepo and main Cargable repository.
   - Effort: Medium.

2. **Dashboard-only implementation before backend contract definition** — Select a UI stack and build screens against assumed data access.
   - Pros: faster visual prototyping.
   - Cons: risks inventing an insecure or incompatible API and cannot satisfy admin authorization requirements.
   - Effort: High rework risk; not recommended.

### Recommendation

Proceed as a contract-first, read-only dashboard monorepo: use `frontend/` for Next.js and `backend/` for the server-authorized API/BFF. Keep shared Supabase schema and database contracts in the main Cargable repository. Keep Platform Costs to clearly labelled workload diagnostics; do not claim monetary AI or total platform costs.

### Risks

- Application scaffolding and testing strategy remain undecided even though Next.js, TypeScript, App Router, Supabase SSR sessions, and Vercel have been selected.
- Backend admin authorization is not implemented yet. MVP membership is managed manually through `admin_members`; a service-role key or broad client-side database access would bypass tenant isolation and is unacceptable.
- Delivery must preserve the agreed order: implement and verify the shared database contract in the main Cargable repository first, then implement the dependent `backend/` API/BFF and `frontend/` dashboard here.
- Current paid subscription data is a present entitlement snapshot, and user activity data cannot substantiate DAU/WAU/MAU.
- Historical AI costs, shared provider costs, egress, and vendor billing cannot be honestly derived from existing operational data.

### Ready for Proposal

**Yes.** The product boundary, evidence-backed MVP, Next.js/TypeScript stack, manual `admin_members` lifecycle, and backend-first cross-repository sequence are defined. Platform Costs monetary reporting remains blocked and is explicitly outside the MVP.
