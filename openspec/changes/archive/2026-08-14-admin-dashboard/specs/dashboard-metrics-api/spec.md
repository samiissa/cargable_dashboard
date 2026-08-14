# Dashboard Metrics API Specification

## Purpose

Provide authorized dashboard consumers with read-only, aggregate, and redacted Business, Invoices, and Operations reporting data owned by verified Cargable contracts.

## Requirements

### Requirement: Authorized Aggregate Reporting

The system MUST return reporting data only to requests that pass verified session and server-side administrator authorization. Responses SHALL contain aggregate or redacted dashboard DTOs and MUST NOT contain raw payloads, raw errors, personally identifiable information, or service-role credentials.

#### Scenario: Authorized request receives an aggregate report

- GIVEN a verified active administrator requests a supported report
- WHEN the report data is available
- THEN the system returns the report's aggregate or redacted data and its freshness metadata

#### Scenario: Unauthorized request is rejected

- GIVEN a request lacks verified administrator authorization
- WHEN it requests any reporting resource
- THEN the system denies the request without report data or protected information

### Requirement: Read-Only Report Domains

The system MUST expose Business, Invoices, and Operations reporting as read-only observations. It MUST NOT expose mutations through reporting resources.

#### Scenario: Supported domain report is requested

- GIVEN an authorized administrator requests Business, Invoices, or Operations data
- WHEN the report is available
- THEN the system returns the corresponding read-only observations

#### Scenario: Mutation is attempted through reporting

- GIVEN an authorized administrator targets a reporting resource
- WHEN the request attempts to create, update, or delete business data
- THEN the system rejects the operation

### Requirement: Business Metric Semantics

The system MUST distinguish registered users from active users. Paid subscriptions MUST be presented as entitlement snapshots, not historical revenue. Monetary Platform Costs and DAU, WAU, and MAU metrics MUST NOT be reported.

#### Scenario: Business metrics are available

- GIVEN an authorized administrator requests Business data
- WHEN registered users or paid subscriptions are reported
- THEN the response labels registered users separately from active users
- AND labels paid subscriptions as an entitlement snapshot

#### Scenario: Unsupported business metric is requested

- GIVEN an authorized administrator requests Platform Costs or DAU, WAU, or MAU
- WHEN the request is evaluated
- THEN the system does not provide that metric

### Requirement: Reliable Ranges and Operational Failures

The system MUST support 7-day, 30-day, and all-time ranges only when the relevant reliable timestamps exist; otherwise it MUST provide labelled snapshots. Operations failures MUST include only terminal failures and exclude retryable failures; failure details MUST be limited to job type, age, and attempts.

#### Scenario: Reliable range is requested

- GIVEN the requested report has reliable timestamps for a supported range
- WHEN an authorized administrator requests the range
- THEN the system returns data for that range

#### Scenario: Range lacks reliable timestamps

- GIVEN the requested report lacks reliable timestamps
- WHEN an authorized administrator requests a time range
- THEN the system returns a clearly labelled snapshot instead of a range claim

#### Scenario: Operations failures are reported

- GIVEN Operations data includes terminal and retryable failures
- WHEN an authorized administrator requests failure details
- THEN the system includes terminal failures only
- AND each detail is limited to job type, age, and attempts
