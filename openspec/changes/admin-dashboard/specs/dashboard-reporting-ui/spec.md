# Dashboard Reporting UI Specification

## Purpose

Present authorized administrators with understandable, read-only Business, Invoices, and Operations reports while accurately communicating freshness, supported ranges, and data limitations.

## Requirements

### Requirement: Authorized Read-Only Reports

The system MUST present Business, Invoices, and Operations reports only after access is authorized. The reporting interface MUST NOT offer actions that change Cargable business data or administrator membership.

#### Scenario: Authorized administrator views reports

- GIVEN an authorized administrator opens the dashboard
- WHEN report data is available
- THEN the interface presents read-only Business, Invoices, and Operations reports

#### Scenario: Access is not authorized

- GIVEN a visitor is not authorized for the dashboard
- WHEN the visitor requests a protected report view
- THEN the interface does not display report data

### Requirement: Metric Meaning and Scope Disclosure

The interface MUST label registered users separately from active users and paid subscriptions as entitlement snapshots. It MUST NOT display monetary Platform Costs, DAU, WAU, MAU, historical revenue claims, raw payloads, raw errors, personally identifiable information, or service-role credentials.

#### Scenario: Business report explains supported metrics

- GIVEN Business data is available
- WHEN an administrator views the Business report
- THEN the interface labels the metric meanings and entitlement snapshot semantics

#### Scenario: Unsupported metrics are absent

- GIVEN an administrator views dashboard reports
- WHEN the interface is rendered
- THEN unsupported metrics and protected information are not displayed

### Requirement: Range and Snapshot Presentation

The interface MUST offer 7-day, 30-day, and all-time views only for data with reliable timestamps. When a range is unavailable, it MUST label the displayed data as a snapshot rather than implying a time range.

#### Scenario: Reliable range is selected

- GIVEN a report supports reliable timestamps for a selected range
- WHEN an administrator selects 7-day, 30-day, or all-time
- THEN the interface displays the selected range and its data

#### Scenario: Range is unsupported

- GIVEN a report has no reliable timestamps for range calculation
- WHEN an administrator views that report
- THEN the interface displays a labelled snapshot
- AND does not present an unsupported range as calculated data

### Requirement: Freshness, Empty States, and Sanitized Operations Details

The interface MUST refresh report data at least every five minutes while it remains open and MUST show the data freshness state. It MUST distinguish an empty result from unavailable data. Operations drill-downs MUST show terminal failures only and limit each item to job type, age, and attempts; retryable failures MUST be excluded.

#### Scenario: Open report reaches its refresh interval

- GIVEN an authorized administrator keeps a report open
- WHEN five minutes elapse since its last successful refresh
- THEN the interface requests updated report data
- AND shows the resulting freshness state

#### Scenario: Report has no matching data

- GIVEN a supported report returns no observations
- WHEN the interface renders the result
- THEN it shows an empty state without treating it as an error

#### Scenario: Report data is unavailable or stale

- GIVEN a report cannot be refreshed successfully
- WHEN the interface renders its last known state
- THEN it identifies the data as unavailable or stale without exposing raw errors

#### Scenario: Operations failures are inspected

- GIVEN Operations data includes terminal and retryable failures
- WHEN an administrator opens failure details
- THEN the interface shows terminal failures with job type, age, and attempts only
