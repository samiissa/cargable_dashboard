import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";

const testConfig = { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon-test-key", contractSha: "test-sha" };

const AUTHENTICATED_USER = { id: "11111111-1111-1111-1111-111111111111", aud: "authenticated" };
const AUTH_HEADERS = { Authorization: "Bearer valid-token" };

const validBusiness = {
  contractVersion: "admin-dashboard/v1",
  report: "business",
  generatedAt: "2026-04-01T10:00:00.000Z",
  registeredUsers: 42,
  activePaidSubscriptions: { kind: "snapshot", snapshotAt: "2026-04-01T10:00:00.000Z", count: 12 },
  metadata: {
    range: "30d",
    semantics: "current_state_of_records_created_in_window",
    startInclusive: "2026-03-02T23:00:00.000Z",
    endExclusive: "2026-04-01T22:00:00.000Z",
  },
};

const snapshotBusiness = {
  ...validBusiness,
  metadata: { range: "all", semantics: "current_state_complete_set", startInclusive: null, endExclusive: null },
};

const validOperations = {
  contractVersion: "admin-dashboard/v1",
  report: "operations",
  generatedAt: "2026-04-01T10:00:00.000Z",
  queueStatusCounts: [{ status: "failed", count: 2 }],
  monthlyReportStatusCounts: [{ status: "ready", count: 1 }],
  unresolvedAlerts: { kind: "snapshot", snapshotAt: "2026-04-01T10:00:00.000Z", count: 1 },
  terminalFailures: [{ jobType: "invoice-import", ageSeconds: 300, attempts: 3 }],
  metadata: { range: "all", semantics: "current_state_complete_set", startInclusive: null, endExclusive: null },
};

function buildApp(rpcResponses: Record<string, { data: unknown; error: { code?: string; message: string } | null }>) {
  const rpc = vi.fn((name: string) => Promise.resolve(rpcResponses[name] ?? { data: null, error: { message: "unexpected rpc" } }));
  const getUser = vi.fn().mockResolvedValue({ data: { user: AUTHENTICATED_USER }, error: null });

  return createApp({
    config: testConfig,
    identityDeps: { createSupabaseClient: () => ({ auth: { getUser } }) as never },
    adminDeps: { createSupabaseClient: () => ({ rpc }) as never },
  });
}

const AUTHORIZED = { data: { contractVersion: "admin-dashboard/v1", authorized: true }, error: null };

describe("dashboard routes", () => {
  it("returns the authorization DTO for a verified active member", async () => {
    const app = buildApp({ admin_dashboard_authorization_v1: AUTHORIZED });

    const res = await app.request("/v1/authorization", { headers: AUTH_HEADERS });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ contractVersion: "admin-dashboard/v1", authorized: true });
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("returns the business report for a verified active member", async () => {
    const app = buildApp({
      admin_dashboard_authorization_v1: AUTHORIZED,
      admin_dashboard_business_v1: { data: validBusiness, error: null },
    });

    const res = await app.request("/v1/reports/business?range=30d", { headers: AUTH_HEADERS });
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body).toEqual(validBusiness);
    expect(body).not.toHaveProperty("platformCosts");
    expect(body).not.toHaveProperty("dau");
  });

  it("returns operations terminal failures limited to job type, age, and attempts", async () => {
    const app = buildApp({
      admin_dashboard_authorization_v1: AUTHORIZED,
      admin_dashboard_operations_v1: { data: validOperations, error: null },
    });

    const res = await app.request("/v1/reports/operations", { headers: AUTH_HEADERS });
    const body = (await res.json()) as typeof validOperations;

    expect(res.status).toBe(200);
    expect(body.terminalFailures).toEqual([{ jobType: "invoice-import", ageSeconds: 300, attempts: 3 }]);
  });

  it("returns a labelled snapshot when the upstream falls back from a requested range", async () => {
    const app = buildApp({
      admin_dashboard_authorization_v1: AUTHORIZED,
      admin_dashboard_business_v1: { data: snapshotBusiness, error: null },
    });

    const res = await app.request("/v1/reports/business?range=7d", { headers: AUTH_HEADERS });
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.metadata).toEqual({
      range: "all",
      semantics: "current_state_complete_set",
      startInclusive: null,
      endExclusive: null,
    });
  });

  it("rejects an unsupported range value before calling the upstream RPC", async () => {
    const rpc = vi.fn();
    const getUser = vi.fn().mockResolvedValue({ data: { user: AUTHENTICATED_USER }, error: null });
    const app = createApp({
      config: testConfig,
      identityDeps: { createSupabaseClient: () => ({ auth: { getUser } }) as never },
      adminDeps: {
        createSupabaseClient: () =>
          ({
            rpc: (name: string) =>
              name === "admin_dashboard_authorization_v1" ? Promise.resolve(AUTHORIZED) : rpc(name),
          }) as never,
      },
    });

    const res = await app.request("/v1/reports/business?range=1y", { headers: AUTH_HEADERS });

    expect(res.status).toBe(400);
    expect((await res.json()) as { error: { code: string } }).toMatchObject({ error: { code: "INVALID_RANGE" } });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a mutation on a reporting resource with a sanitized 405", async () => {
    const app = buildApp({ admin_dashboard_authorization_v1: AUTHORIZED });

    const res = await app.request("/v1/reports/business", { method: "POST", headers: AUTH_HEADERS });

    expect(res.status).toBe(405);
    expect((await res.json()) as { error: { code: string } }).toMatchObject({ error: { code: "METHOD_NOT_ALLOWED" } });
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("rejects a mutation on the authorization resource with a sanitized 405", async () => {
    const app = buildApp({ admin_dashboard_authorization_v1: AUTHORIZED });

    const res = await app.request("/v1/authorization", { method: "DELETE", headers: AUTH_HEADERS });

    expect(res.status).toBe(405);
    expect((await res.json()) as { error: { code: string } }).toMatchObject({ error: { code: "METHOD_NOT_ALLOWED" } });
  });

  it("denies an anonymous request to a report resource without report data", async () => {
    const app = buildApp({});

    const res = await app.request("/v1/reports/invoices");

    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
