import { describe, expect, it } from "vitest";

import {
  authorizationSchema,
  businessReportSchema,
  invoicesReportSchema,
  operationsReportSchema,
} from "../src/index.js";

// Fixtures below are copied verbatim from the pinned provider fixtures at
// supabase/contracts/admin-dashboard/v1/fixtures/ (remote/revision recorded
// in packages/contracts/source.json). Values are synthetic and non-identifying.

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

const validInvoices = {
  contractVersion: "admin-dashboard/v1",
  report: "invoices",
  generatedAt: "2026-04-01T10:00:00.000Z",
  invoiceStatusCounts: [{ status: "confirmed", count: 3 }],
  invoiceChannels: [{ channel: "email", count: 2 }],
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

describe("generated DTO validation against provider fixtures", () => {
  it("accepts the valid authorization, business, invoices, and operations fixtures", () => {
    expect(authorizationSchema.safeParse({ contractVersion: "admin-dashboard/v1", authorized: true }).success).toBe(true);
    expect(businessReportSchema.safeParse(validBusiness).success).toBe(true);
    expect(invoicesReportSchema.safeParse(validInvoices).success).toBe(true);
    expect(operationsReportSchema.safeParse(validOperations).success).toBe(true);
  });

  it("accepts business warnings as an optional, non-widening field", () => {
    const result = businessReportSchema.safeParse({ ...validBusiness, warnings: ["partial data due to a maintenance window"] });

    expect(result.success).toBe(true);
  });

  it("accepts an empty business report as a real zero-count result, not an unavailable state", () => {
    const empty = {
      ...validBusiness,
      registeredUsers: 0,
      activePaidSubscriptions: { kind: "snapshot", snapshotAt: "2026-04-01T10:00:00.000Z", count: 0 },
      metadata: { range: "all", semantics: "current_state_complete_set", startInclusive: null, endExclusive: null },
    };

    expect(businessReportSchema.safeParse(empty).success).toBe(true);
  });

  it("rejects an unallowlisted protected field even when all required fields are present", () => {
    const result = businessReportSchema.safeParse({ ...validBusiness, internalDebugId: "must-not-leak" });

    expect(result.success).toBe(false);
  });

  it("rejects a sensitive field on the operations report", () => {
    const result = operationsReportSchema.safeParse({ ...validOperations, token: "must-not-leak" });

    expect(result.success).toBe(false);
  });

  it("rejects an invoice channel outside the allowlisted enum", () => {
    const result = invoicesReportSchema.safeParse({
      ...validInvoices,
      invoiceChannels: [{ channel: "sms", count: 1 }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects metadata whose semantics do not match its declared range", () => {
    const result = businessReportSchema.safeParse({
      ...validBusiness,
      metadata: { ...validBusiness.metadata, semantics: "historical_status_at_each_point" },
    });

    expect(result.success).toBe(false);
  });

  it("rejects a report missing a required field", () => {
    const missingRequired: Record<string, unknown> = { ...validBusiness };
    delete missingRequired.activePaidSubscriptions;

    expect(businessReportSchema.safeParse(missingRequired).success).toBe(false);
  });

  it("rejects an incompatible field type", () => {
    const result = businessReportSchema.safeParse({ ...validBusiness, registeredUsers: "one" });

    expect(result.success).toBe(false);
  });

  it("limits terminal Operations failures to job type, age, and attempts only, up to 50 entries", () => {
    const withExtraField = {
      ...validOperations,
      terminalFailures: [{ jobType: "invoice-import", ageSeconds: 300, attempts: 3, stackTrace: "must-not-leak" }],
    };
    const overLimit = { ...validOperations, terminalFailures: Array.from({ length: 51 }, () => validOperations.terminalFailures[0]) };

    expect(operationsReportSchema.safeParse(withExtraField).success).toBe(false);
    expect(operationsReportSchema.safeParse(overLimit).success).toBe(false);
    expect(operationsReportSchema.safeParse(validOperations).success).toBe(true);
  });

  it("distinguishes a reliable range from an all-time snapshot in metadata", () => {
    const rangeResult = invoicesReportSchema.safeParse({
      ...validInvoices,
      metadata: {
        range: "7d",
        semantics: "current_state_of_records_created_in_window",
        startInclusive: "2026-03-26T23:00:00.000Z",
        endExclusive: "2026-04-01T22:00:00.000Z",
      },
    });
    const snapshotResult = invoicesReportSchema.safeParse(validInvoices);

    expect(rangeResult.success).toBe(true);
    expect(snapshotResult.success).toBe(true);
    expect(snapshotResult.data?.metadata.startInclusive).toBeNull();
  });
});
