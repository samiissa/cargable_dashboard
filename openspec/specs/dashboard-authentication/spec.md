# Dashboard Authentication Specification

## Purpose

Ensure that only verified, manually provisioned Cargable administrators can obtain dashboard pages or dashboard API data.

## Requirements

### Requirement: Verified Session Access

The system MUST verify the requesting user's authentication session before granting access to any dashboard page or processing any dashboard API request.

#### Scenario: Verified administrator requests a dashboard page

- GIVEN a request has a valid authenticated user session
- AND the user is an active administrator
- WHEN the user requests a dashboard page
- THEN the system grants access to the page

#### Scenario: Unauthenticated request is denied

- GIVEN a request has no valid authenticated user session
- WHEN the request targets a dashboard page or API endpoint
- THEN the system denies access without dashboard data

### Requirement: Server-Side Administrator Authorization

The system MUST determine administrator eligibility on the server from the main Cargable repository's `admin_members` contract for every dashboard API request and protected page request.

#### Scenario: Authorized member requests an API response

- GIVEN a verified session belongs to an active `admin_members` entry
- WHEN the user requests a dashboard API resource
- THEN the system returns only the response allowed by that resource

#### Scenario: Authenticated non-member requests an API response

- GIVEN a verified session does not belong to an active `admin_members` entry
- WHEN the user requests a dashboard API resource
- THEN the system denies the request without report data

### Requirement: Manual Administrator Lifecycle Boundary

The dashboard MUST NOT provide an interface or API that creates, changes, or removes `admin_members` entries. It SHALL rely on the externally managed membership lifecycle.

#### Scenario: Administrator lifecycle controls are absent

- GIVEN an authorized administrator accesses the dashboard
- WHEN the available pages and API resources are inspected
- THEN no administrator membership management capability is available

### Requirement: Privileged Data Isolation

The system MUST NOT expose service-role credentials, raw backend errors, raw payloads, or personally identifiable information in browser-visible authentication or authorization responses.

#### Scenario: Authorization evaluation fails internally

- GIVEN an authorization dependency cannot be evaluated
- WHEN a protected page or API resource is requested
- THEN the system denies access with a sanitized response
- AND the response contains none of the protected information
