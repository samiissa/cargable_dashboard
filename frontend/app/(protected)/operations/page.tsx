"use client";

import { operationsReportSchema, type OperationsReport } from "@cargable/contracts";
import { useState } from "react";

import type { SupportedRange } from "../../../src/api/dashboard-proxy";
import { OperationsReportView } from "../../../src/reports/operations-report-view";
import { useReport } from "../../../src/reports/use-report";

function isEmptyOperations(data: OperationsReport): boolean {
  return (
    data.queueStatusCounts.length === 0 &&
    data.monthlyReportStatusCounts.length === 0 &&
    data.unresolvedAlerts.count === 0 &&
    data.terminalFailures.length === 0
  );
}

export default function OperationsPage() {
  const [range, setRange] = useState<SupportedRange>("30d");
  const { data, status, lastUpdatedAt, refresh } = useReport({
    path: "reports/operations",
    range,
    schema: operationsReportSchema,
    isEmpty: isEmptyOperations,
  });

  return (
    <OperationsReportView
      data={data}
      status={status}
      lastUpdatedAt={lastUpdatedAt}
      range={range}
      onRangeChange={setRange}
      onRefresh={refresh}
    />
  );
}
