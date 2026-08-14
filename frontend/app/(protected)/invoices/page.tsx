"use client";

import { invoicesReportSchema, type InvoicesReport } from "@cargable/contracts";
import { useState } from "react";

import type { SupportedRange } from "../../../src/api/dashboard-proxy";
import { InvoicesReportView } from "../../../src/reports/invoices-report-view";
import { useReport } from "../../../src/reports/use-report";

function isEmptyInvoices(data: InvoicesReport): boolean {
  return data.invoiceStatusCounts.length === 0 && data.invoiceChannels.length === 0;
}

export default function InvoicesPage() {
  const [range, setRange] = useState<SupportedRange>("30d");
  const { data, status, lastUpdatedAt, refresh } = useReport({
    path: "reports/invoices",
    range,
    schema: invoicesReportSchema,
    isEmpty: isEmptyInvoices,
  });

  return (
    <InvoicesReportView
      data={data}
      status={status}
      lastUpdatedAt={lastUpdatedAt}
      range={range}
      onRangeChange={setRange}
      onRefresh={refresh}
    />
  );
}
