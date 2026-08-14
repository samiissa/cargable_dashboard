/** @vitest-environment jsdom */
import { cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { BusinessReportView } from "../../src/reports/business-report-view";
import { OperationsReportView } from "../../src/reports/operations-report-view";
import { useReport } from "../../src/reports/use-report";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const itemSchema = z.object({ value: z.number() });

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: () => Promise.resolve(body) } as unknown as Response;
}

describe("useReport", () => {
  it("transitions from loading to ready with the fetched, schema-validated data", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ value: 42 }));
    const { result } = renderHook(() => useReport({ path: "reports/business", schema: itemSchema, fetchImpl }));

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.data).toEqual({ value: 42 });
    expect(result.current.lastUpdatedAt).toBeInstanceOf(Date);
  });

  it("marks the result empty when isEmpty matches the fetched data", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ value: 0 }));
    const { result } = renderHook(() =>
      useReport({ path: "reports/business", schema: itemSchema, fetchImpl, isEmpty: (d) => d.value === 0 }),
    );

    await waitFor(() => expect(result.current.status).toBe("empty"));
  });

  it("marks the result unavailable on a first-load failure, without any prior data", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useReport({ path: "reports/business", schema: itemSchema, fetchImpl }));

    await waitFor(() => expect(result.current.status).toBe("unavailable"));
    expect(result.current.data).toBeUndefined();
  });

  it("retains the last successful data and marks it stale when a later refresh fails", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ value: 7 }))
      .mockRejectedValueOnce(new Error("temporary failure"));
    const { result } = renderHook(() => useReport({ path: "reports/business", schema: itemSchema, fetchImpl }));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    result.current.refresh();

    await waitFor(() => expect(result.current.status).toBe("stale"));
    expect(result.current.data).toEqual({ value: 7 });
  });

  it("treats an invalid (contract-violating) response as a failure rather than trusting it", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ unexpected: "field" }));
    const { result } = renderHook(() => useReport({ path: "reports/business", schema: itemSchema, fetchImpl }));

    await waitFor(() => expect(result.current.status).toBe("unavailable"));
  });

  it("automatically refreshes every 300 seconds while mounted", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ value: 1 }));
    renderHook(() => useReport({ path: "reports/business", schema: itemSchema, fetchImpl }));

    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(300_000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(300_000);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});

describe("BusinessReportView", () => {
  const businessData = {
    contractVersion: "admin-dashboard/v1" as const,
    report: "business" as const,
    generatedAt: "2026-04-01T10:00:00.000Z",
    registeredUsers: 42,
    activePaidSubscriptions: { kind: "snapshot" as const, snapshotAt: "2026-04-01T10:00:00.000Z", count: 12 },
    metadata: {
      range: "30d" as const,
      semantics: "current_state_of_records_created_in_window" as const,
      startInclusive: "2026-03-02T23:00:00.000Z",
      endExclusive: "2026-04-01T22:00:00.000Z",
    },
  };

  it("labels registered users and paid subscriptions as an entitlement snapshot", () => {
    render(
      <BusinessReportView
        data={businessData}
        status="ready"
        lastUpdatedAt={new Date()}
        range="30d"
        onRangeChange={() => {}}
        onRefresh={() => {}}
      />,
    );

    expect(screen.getByText("Registered users")).toBeInTheDocument();
    expect(screen.getByText("Active paid subscriptions (entitlement snapshot)")).toBeInTheDocument();
  });

  it("never displays unsupported metrics such as Platform Costs, DAU, WAU, or MAU", () => {
    render(
      <BusinessReportView
        data={businessData}
        status="ready"
        lastUpdatedAt={new Date()}
        range="30d"
        onRangeChange={() => {}}
        onRefresh={() => {}}
      />,
    );

    const text = document.body.textContent ?? "";
    for (const forbidden of ["Platform Costs", "DAU", "WAU", "MAU"]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("displays the reliable range window when the response provides one", () => {
    render(
      <BusinessReportView
        data={businessData}
        status="ready"
        lastUpdatedAt={new Date()}
        range="30d"
        onRangeChange={() => {}}
        onRefresh={() => {}}
      />,
    );

    expect(screen.getByText(/30d range:/)).toBeInTheDocument();
  });

  it("labels the result as a snapshot instead of a calculated range when reliable timestamps are unavailable", () => {
    const snapshotData = {
      ...businessData,
      metadata: { range: "all" as const, semantics: "current_state_complete_set" as const, startInclusive: null, endExclusive: null },
    };
    render(
      <BusinessReportView
        data={snapshotData}
        status="ready"
        lastUpdatedAt={new Date()}
        range="all"
        onRangeChange={() => {}}
        onRefresh={() => {}}
      />,
    );

    expect(screen.getByText(/Snapshot/)).toBeInTheDocument();
  });

  it("shows an empty state without treating it as an error", () => {
    render(
      <BusinessReportView
        data={businessData}
        status="empty"
        lastUpdatedAt={new Date()}
        range="30d"
        onRangeChange={() => {}}
        onRefresh={() => {}}
      />,
    );

    expect(screen.getByText(/No business observations/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("identifies unavailable data without exposing a raw error", () => {
    render(
      <BusinessReportView
        data={undefined}
        status="unavailable"
        lastUpdatedAt={undefined}
        range="30d"
        onRangeChange={() => {}}
        onRefresh={() => {}}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Business report is unavailable.");
  });

  it("marks stale data as stale while still showing the last known values", () => {
    render(
      <BusinessReportView
        data={businessData}
        status="stale"
        lastUpdatedAt={new Date()}
        range="30d"
        onRangeChange={() => {}}
        onRefresh={() => {}}
      />,
    );

    expect(screen.getByText(/Stale — showing last known data/)).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });
});

describe("OperationsReportView terminal failure redaction", () => {
  const operationsData = {
    contractVersion: "admin-dashboard/v1" as const,
    report: "operations" as const,
    generatedAt: "2026-04-01T10:00:00.000Z",
    queueStatusCounts: [{ status: "failed", count: 2 }],
    monthlyReportStatusCounts: [{ status: "ready", count: 1 }],
    unresolvedAlerts: { kind: "snapshot" as const, snapshotAt: "2026-04-01T10:00:00.000Z", count: 1 },
    terminalFailures: [{ jobType: "invoice-import", ageSeconds: 300, attempts: 3 }],
    metadata: { range: "all" as const, semantics: "current_state_complete_set" as const, startInclusive: null, endExclusive: null },
  };

  it("shows each terminal failure limited to job type, age, and attempts", () => {
    render(
      <OperationsReportView
        data={operationsData}
        status="ready"
        lastUpdatedAt={new Date()}
        range="all"
        onRangeChange={() => {}}
        onRefresh={() => {}}
      />,
    );

    expect(screen.getByText(/invoice-import — age 300s, attempts 3/)).toBeInTheDocument();
  });
});
