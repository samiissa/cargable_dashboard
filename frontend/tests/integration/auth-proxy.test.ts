import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { handleDashboardProxy } from "../../src/api/dashboard-proxy";

const testConfig = {
  supabaseUrl: "https://example.supabase.co",
  supabaseAnonKey: "anon-test-key",
  backendUrl: "https://backend.example.test",
};

const VERIFIED_TOKEN = "verified-access-token";

function fakeClient(overrides: {
  getClaims?: () => Promise<{ data: unknown; error: { message: string } | null }>;
  getUser?: () => Promise<{ data: { user: unknown }; error: { message: string } | null }>;
  getSession?: () => Promise<{ data: { session: { access_token: string } | null }; error: { message: string } | null }>;
}): SupabaseClient {
  return {
    auth: {
      getClaims: overrides.getClaims ?? vi.fn().mockResolvedValue({ data: null, error: { message: "no session" } }),
      getUser: overrides.getUser ?? vi.fn().mockResolvedValue({ data: { user: null }, error: { message: "no session" } }),
      getSession:
        overrides.getSession ??
        vi.fn().mockResolvedValue({ data: { session: { access_token: VERIFIED_TOKEN } }, error: null }),
    },
  } as unknown as SupabaseClient;
}

const ANONYMOUS_CLIENT = fakeClient({});

const validBusinessBody = { contractVersion: "admin-dashboard/v1", report: "business" };

function backendFetchReturning(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

describe("dashboard proxy authentication and allowlisting", () => {
  it("denies a request with no session cookie without calling the backend", async () => {
    const createSupabaseClient = vi.fn().mockReturnValue(ANONYMOUS_CLIENT);
    const fetchBackend = backendFetchReturning(validBusinessBody);

    const res = await handleDashboardProxy(new Request("https://admin.cargable.es/api/dashboard/reports/business"), [
      "reports",
      "business",
    ], { config: testConfig, fetchBackend, createSupabaseClient });

    expect(res.status).toBe(401);
    expect((await res.json()) as { error: { code: string } }).toMatchObject({ error: { code: "UNAUTHENTICATED" } });
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(fetchBackend).not.toHaveBeenCalled();
  });

  it("denies an invalid session (claims and user verification both fail) without calling the backend", async () => {
    const createSupabaseClient = vi.fn().mockReturnValue(
      fakeClient({
        getClaims: vi.fn().mockResolvedValue({ data: null, error: { message: "jwt expired" } }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: "jwt expired" } }),
      }),
    );
    const fetchBackend = backendFetchReturning(validBusinessBody);

    const res = await handleDashboardProxy(
      new Request("https://admin.cargable.es/api/dashboard/reports/business", {
        headers: { Cookie: "sb-access-token=forged-session-value" },
      }),
      ["reports", "business"],
      { config: testConfig, fetchBackend, createSupabaseClient },
    );

    expect(res.status).toBe(401);
    expect(fetchBackend).not.toHaveBeenCalled();
  });

  it("forwards the verified token to the backend only after getClaims() succeeds", async () => {
    const getClaims = vi.fn().mockResolvedValue({ data: { claims: { sub: "user-1" } }, error: null });
    const getUser = vi.fn();
    const createSupabaseClient = vi.fn().mockReturnValue(fakeClient({ getClaims, getUser }));
    const fetchBackend = backendFetchReturning(validBusinessBody);

    const res = await handleDashboardProxy(
      new Request("https://admin.cargable.es/api/dashboard/reports/business?range=30d", {
        headers: { Cookie: "sb-access-token=real-session" },
      }),
      ["reports", "business"],
      { config: testConfig, fetchBackend, createSupabaseClient },
    );

    expect(res.status).toBe(200);
    expect(getClaims).toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
    expect(fetchBackend).toHaveBeenCalledWith(
      "https://backend.example.test/v1/reports/business?range=30d",
      expect.objectContaining({ headers: { Authorization: `Bearer ${VERIFIED_TOKEN}` }, cache: "no-store" }),
    );
  });

  it("falls back to getUser() when getClaims() is unavailable, and still verifies before forwarding", async () => {
    const getClaims = vi.fn().mockRejectedValue(new Error("jwks unavailable"));
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const createSupabaseClient = vi.fn().mockReturnValue(fakeClient({ getClaims, getUser }));
    const fetchBackend = backendFetchReturning({ contractVersion: "admin-dashboard/v1", authorized: true });

    const res = await handleDashboardProxy(new Request("https://admin.cargable.es/api/dashboard/authorization"), [
      "authorization",
    ], { config: testConfig, fetchBackend, createSupabaseClient });

    expect(res.status).toBe(200);
    expect(getUser).toHaveBeenCalled();
    expect(fetchBackend).toHaveBeenCalledWith(
      "https://backend.example.test/v1/authorization",
      expect.objectContaining({ headers: { Authorization: `Bearer ${VERIFIED_TOKEN}` } }),
    );
  });

  it("rejects a request to a non-allowlisted path without calling the backend", async () => {
    const createSupabaseClient = vi.fn().mockReturnValue(ANONYMOUS_CLIENT);
    const fetchBackend = backendFetchReturning(validBusinessBody);

    const res = await handleDashboardProxy(new Request("https://admin.cargable.es/api/dashboard/admin/users"), [
      "admin",
      "users",
    ], { config: testConfig, fetchBackend, createSupabaseClient });

    expect(res.status).toBe(404);
    expect(fetchBackend).not.toHaveBeenCalled();
  });

  it("rejects a mutation attempt on a report resource with a sanitized 405", async () => {
    const createSupabaseClient = vi.fn().mockReturnValue(fakeClient({ getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u" } }, error: null }) }));
    const fetchBackend = backendFetchReturning(validBusinessBody);

    const res = await handleDashboardProxy(
      new Request("https://admin.cargable.es/api/dashboard/reports/business", { method: "POST" }),
      ["reports", "business"],
      { config: testConfig, fetchBackend, createSupabaseClient },
    );

    expect(res.status).toBe(405);
    expect((await res.json()) as { error: { code: string } }).toMatchObject({ error: { code: "METHOD_NOT_ALLOWED" } });
    expect(fetchBackend).not.toHaveBeenCalled();
  });

  it("rejects an unsupported range value before calling the backend", async () => {
    const createSupabaseClient = vi.fn().mockReturnValue(fakeClient({ getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u" } }, error: null }) }));
    const fetchBackend = backendFetchReturning(validBusinessBody);

    const res = await handleDashboardProxy(
      new Request("https://admin.cargable.es/api/dashboard/reports/business?range=1y"),
      ["reports", "business"],
      { config: testConfig, fetchBackend, createSupabaseClient },
    );

    expect(res.status).toBe(400);
    expect(fetchBackend).not.toHaveBeenCalled();
  });

  it("returns a sanitized 503 without leaking the raw network error when the backend is unreachable", async () => {
    const createSupabaseClient = vi.fn().mockReturnValue(fakeClient({ getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u" } }, error: null }) }));
    const fetchBackend = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:4000"));

    const res = await handleDashboardProxy(
      new Request("https://admin.cargable.es/api/dashboard/reports/invoices"),
      ["reports", "invoices"],
      { config: testConfig, fetchBackend, createSupabaseClient },
    );
    const bodyText = await res.clone().text();

    expect(res.status).toBe(503);
    expect(bodyText).not.toContain("ECONNREFUSED");
  });

  it("never forwards the incoming cookie header to the backend", async () => {
    const createSupabaseClient = vi.fn().mockReturnValue(fakeClient({ getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u" } }, error: null }) }));
    const fetchBackend = backendFetchReturning(validBusinessBody);

    await handleDashboardProxy(
      new Request("https://admin.cargable.es/api/dashboard/reports/business", {
        headers: { Cookie: "sb-access-token=real-session" },
      }),
      ["reports", "business"],
      { config: testConfig, fetchBackend, createSupabaseClient },
    );

    const [, init] = fetchBackend.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toEqual({ Authorization: `Bearer ${VERIFIED_TOKEN}` });
  });

  it("sets Cache-Control: private, no-store on every response", async () => {
    const createSupabaseClient = vi.fn().mockReturnValue(ANONYMOUS_CLIENT);
    const fetchBackend = backendFetchReturning(validBusinessBody);

    const res = await handleDashboardProxy(new Request("https://admin.cargable.es/api/dashboard/reports/business"), [
      "reports",
      "business",
    ], { config: testConfig, fetchBackend, createSupabaseClient });

    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
