import { businessReportSchema } from "@cargable/contracts";
import { describe, expect, it, vi } from "vitest";

import {
  ALLOWLISTED_RPCS,
  type AllowlistedRpc,
  createCargableRpcCaller,
  parseRange,
  RpcCallError,
} from "../../src/services/cargable-rpc.js";

const testConfig = { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon-test-key" };

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

function buildCaller(rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>) {
  return createCargableRpcCaller({
    config: testConfig,
    bearerToken: "token",
    createSupabaseClient: () => ({ rpc }) as never,
  });
}

describe("parseRange", () => {
  it("accepts each supported range value", () => {
    expect(parseRange("7d")).toBe("7d");
    expect(parseRange("30d")).toBe("30d");
    expect(parseRange("all")).toBe("all");
  });

  it("defaults an absent range to 30d", () => {
    expect(parseRange(undefined)).toBe("30d");
  });

  it("rejects an unsupported range value", () => {
    expect(() => parseRange("1y")).toThrow(RpcCallError);
    try {
      parseRange("1y");
    } catch (err) {
      expect(err).toBeInstanceOf(RpcCallError);
      expect((err as RpcCallError).kind).toBe("invalid_range");
    }
  });
});

describe("createCargableRpcCaller", () => {
  it("rejects an RPC name outside the allowlist without calling the upstream client", async () => {
    const rpc = vi.fn();
    const caller = buildCaller(rpc);

    await expect(caller("admin_dashboard_delete_v1" as unknown as AllowlistedRpc, {}, businessReportSchema)).rejects.toMatchObject({
      kind: "dependency_failure",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("only ever calls names present in the allowlist constant", () => {
    expect(ALLOWLISTED_RPCS).toContain("admin_dashboard_business_v1");
    expect(ALLOWLISTED_RPCS).toHaveLength(4);
  });

  it("returns validated data for a well-formed response", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: validBusiness, error: null });
    const caller = buildCaller(rpc);

    const result = await caller("admin_dashboard_business_v1", { p_range: "30d" }, businessReportSchema);

    expect(result).toEqual(validBusiness);
  });

  it("rejects a raw non-object response instead of returning it uncontrolled", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "not-a-report", error: null });
    const caller = buildCaller(rpc);

    await expect(caller("admin_dashboard_business_v1", {}, businessReportSchema)).rejects.toMatchObject({
      kind: "invalid_response",
    });
  });

  it("rejects a response carrying an unallowlisted sensitive field", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { ...validBusiness, internalDebugToken: "leak" }, error: null });
    const caller = buildCaller(rpc);

    await expect(caller("admin_dashboard_business_v1", {}, businessReportSchema)).rejects.toMatchObject({
      kind: "invalid_response",
    });
  });

  it("fails closed after the 8-second timeout instead of waiting indefinitely", async () => {
    vi.useFakeTimers();
    try {
      const rpc = vi.fn().mockReturnValue(new Promise(() => {}));
      const caller = buildCaller(rpc);

      const pending = caller("admin_dashboard_business_v1", {}, businessReportSchema);
      const assertion = expect(pending).rejects.toMatchObject({ kind: "timeout" });
      await vi.advanceTimersByTimeAsync(8000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("resolves normally when the upstream responds before the timeout", async () => {
    vi.useFakeTimers();
    try {
      const rpc = vi.fn().mockResolvedValue({ data: validBusiness, error: null });
      const caller = buildCaller(rpc);

      const result = await caller("admin_dashboard_business_v1", {}, businessReportSchema);

      expect(result).toEqual(validBusiness);
    } finally {
      vi.useRealTimers();
    }
  });
});
