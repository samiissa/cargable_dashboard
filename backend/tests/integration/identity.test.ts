import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import { createAdminMiddleware } from "../../src/middleware/admin.js";
import { errorHandler, requestContext } from "../../src/middleware/errors.js";
import { createIdentityMiddleware } from "../../src/middleware/identity.js";

const testConfig = { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon-test-key" };

const AUTHENTICATED_USER = { id: "11111111-1111-1111-1111-111111111111", aud: "authenticated" };

function buildTestApp(deps: {
  getUser: (token: string) => Promise<{ data: { user: typeof AUTHENTICATED_USER | null }; error: { message: string } | null }>;
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
}) {
  const app = new Hono();
  app.onError(errorHandler);
  app.use("*", requestContext);
  app.use(
    "*",
    createIdentityMiddleware(testConfig, {
      createSupabaseClient: () => ({ auth: { getUser: deps.getUser } }) as never,
    }),
  );
  app.use(
    "*",
    createAdminMiddleware(testConfig, {
      createSupabaseClient: () => ({ rpc: deps.rpc }) as never,
    }),
  );
  app.get("/v1/authorization", (c) => c.json({ contractVersion: "admin-dashboard/v1", authorized: true }));
  return app;
}

async function readError(res: Response) {
  const body = (await res.json()) as { error: { code: string; requestId: string } };
  return body.error;
}

describe("identity and admin authorization middleware", () => {
  it("denies an anonymous request without calling the identity dependency", async () => {
    const getUser = vi.fn();
    const rpc = vi.fn();
    const app = buildTestApp({ getUser, rpc });

    const res = await app.request("/v1/authorization");

    expect(res.status).toBe(401);
    expect((await readError(res)).code).toBe("UNAUTHENTICATED");
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(getUser).not.toHaveBeenCalled();
  });

  it("ignores a spoofed cookie and denies as anonymous", async () => {
    const getUser = vi.fn();
    const rpc = vi.fn();
    const app = buildTestApp({ getUser, rpc });

    const res = await app.request("/v1/authorization", {
      headers: { Cookie: "sb-access-token=forged-session-value" },
    });

    expect(res.status).toBe(401);
    expect((await readError(res)).code).toBe("UNAUTHENTICATED");
    expect(getUser).not.toHaveBeenCalled();
  });

  it("denies an expired bearer token without leaking the upstream error", async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: { message: "jwt expired" } });
    const rpc = vi.fn();
    const app = buildTestApp({ getUser, rpc });

    const res = await app.request("/v1/authorization", { headers: { Authorization: "Bearer expired-token" } });
    const bodyText = await res.clone().text();

    expect(res.status).toBe(401);
    expect((await readError(res)).code).toBe("UNAUTHENTICATED");
    expect(bodyText).not.toContain("jwt expired");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("denies a token whose verified audience does not match an authenticated session", async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-2", aud: "anon" } }, error: null });
    const rpc = vi.fn();
    const app = buildTestApp({ getUser, rpc });

    const res = await app.request("/v1/authorization", { headers: { Authorization: "Bearer wrong-audience-token" } });

    expect(res.status).toBe(401);
    expect((await readError(res)).code).toBe("CLAIMS_MISMATCH");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("denies a verified non-member without report data", async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: AUTHENTICATED_USER }, error: null });
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "42501", message: "insufficient_privilege" } });
    const app = buildTestApp({ getUser, rpc });

    const res = await app.request("/v1/authorization", { headers: { Authorization: "Bearer valid-token" } });

    expect(res.status).toBe(403);
    expect((await readError(res)).code).toBe("FORBIDDEN");
  });

  it("denies a verified but revoked member without report data", async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: AUTHENTICATED_USER }, error: null });
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: "42501", message: "membership revoked for this user" } });
    const app = buildTestApp({ getUser, rpc });

    const res = await app.request("/v1/authorization", { headers: { Authorization: "Bearer valid-token" } });

    expect(res.status).toBe(403);
    expect((await readError(res)).code).toBe("FORBIDDEN");
  });

  it("fails closed with a sanitized error when the membership dependency is unreachable", async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: AUTHENTICATED_USER }, error: null });
    const rpc = vi.fn().mockRejectedValue(new Error("connect ETIMEDOUT 10.0.0.1:5432"));
    const app = buildTestApp({ getUser, rpc });

    const res = await app.request("/v1/authorization", { headers: { Authorization: "Bearer valid-token" } });
    const bodyText = await res.clone().text();

    expect(res.status).toBe(503);
    expect((await readError(res)).code).toBe("DEPENDENCY_UNAVAILABLE");
    expect(bodyText).not.toContain("ETIMEDOUT");
  });

  it("allows a verified active member through to the route", async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: AUTHENTICATED_USER }, error: null });
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: { contractVersion: "admin-dashboard/v1", authorized: true }, error: null });
    const app = buildTestApp({ getUser, rpc });

    const res = await app.request("/v1/authorization", { headers: { Authorization: "Bearer valid-token" } });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ contractVersion: "admin-dashboard/v1", authorized: true });
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
