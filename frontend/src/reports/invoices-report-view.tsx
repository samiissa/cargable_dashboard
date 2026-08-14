"use client";

import type { InvoicesReport } from "@cargable/contracts";

import type { SupportedRange } from "../api/dashboard-proxy";
import { FreshnessLabel } from "./freshness-label";
import { formatRangeLabel } from "./metadata";
import { RangeSelector } from "./range-selector";
import type { ReportStatus } from "./use-report";

export interface InvoicesReportViewProps {
  data: InvoicesReport | undefined;
  status: ReportStatus;
  lastUpdatedAt: Date | undefined;
  range: SupportedRange;
  onRangeChange: (range: SupportedRange) => void;
  onRefresh: () => void;
}

/** Presentational only — see `app/(protected)/invoices/page.tsx` for the data-fetching container. */
export function InvoicesReportView({ data, status, lastUpdatedAt, range, onRangeChange, onRefresh }: InvoicesReportViewProps) {
  const showData = data && (status === "ready" || status === "stale");

  return (
    <section aria-labelledby="invoices-report-heading">
      <h1 id="invoices-report-heading">Invoices</h1>
      <RangeSelector value={range} onChange={onRangeChange} />
      <FreshnessLabel status={status} lastUpdatedAt={lastUpdatedAt} onRefresh={onRefresh} />
      {status === "loading" && <p>Loading invoices report…</p>}
      {status === "unavailable" && <p role="alert">Invoices report is unavailable.</p>}
      {status === "empty" && <p>No invoice observations for this range.</p>}
      {showData && (
        <>
          <h2>Invoice status</h2>
          <ul>
            {data.invoiceStatusCounts.map((entry) => (
              <li key={entry.status}>
                {entry.status}: {entry.count}
              </li>
            ))}
          </ul>
          <h2>Invoice channels</h2>
          <ul>
            {data.invoiceChannels.map((entry) => (
              <li key={entry.channel}>
                {entry.channel}: {entry.count}
              </li>
            ))}
          </ul>
          <p>{formatRangeLabel(data.metadata)}</p>
        </>
      )}
    </section>
  );
}
