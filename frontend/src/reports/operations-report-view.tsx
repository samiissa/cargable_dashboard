"use client";

import type { OperationsReport } from "@cargable/contracts";

import type { SupportedRange } from "../api/dashboard-proxy";
import { FreshnessLabel } from "./freshness-label";
import { formatRangeLabel } from "./metadata";
import { RangeSelector } from "./range-selector";
import type { ReportStatus } from "./use-report";

export interface OperationsReportViewProps {
  data: OperationsReport | undefined;
  status: ReportStatus;
  lastUpdatedAt: Date | undefined;
  range: SupportedRange;
  onRangeChange: (range: SupportedRange) => void;
  onRefresh: () => void;
}

/**
 * Presentational only — see `app/(protected)/operations/page.tsx` for the
 * data-fetching container. Terminal failure details are limited to job
 * type, age, and attempts because that is all the redacted, strict-schema
 * DTO ever carries; retryable failures never reach this component.
 */
export function OperationsReportView({ data, status, lastUpdatedAt, range, onRangeChange, onRefresh }: OperationsReportViewProps) {
  const showData = data && (status === "ready" || status === "stale");

  return (
    <section aria-labelledby="operations-report-heading">
      <h1 id="operations-report-heading">Operations</h1>
      <RangeSelector value={range} onChange={onRangeChange} />
      <FreshnessLabel status={status} lastUpdatedAt={lastUpdatedAt} onRefresh={onRefresh} />
      {status === "loading" && <p>Loading operations report…</p>}
      {status === "unavailable" && <p role="alert">Operations report is unavailable.</p>}
      {status === "empty" && <p>No operations observations for this range.</p>}
      {showData && (
        <>
          <h2>Queue status</h2>
          <ul>
            {data.queueStatusCounts.map((entry) => (
              <li key={entry.status}>
                {entry.status}: {entry.count}
              </li>
            ))}
          </ul>
          <h2>Monthly report status</h2>
          <ul>
            {data.monthlyReportStatusCounts.map((entry) => (
              <li key={entry.status}>
                {entry.status}: {entry.count}
              </li>
            ))}
          </ul>
          <p>Unresolved alerts (snapshot): {data.unresolvedAlerts.count}</p>
          <details>
            <summary>Terminal failures ({data.terminalFailures.length})</summary>
            <ul>
              {data.terminalFailures.map((failure, index) => (
                <li key={index}>
                  {failure.jobType} — age {failure.ageSeconds}s, attempts {failure.attempts}
                </li>
              ))}
            </ul>
          </details>
          <p>{formatRangeLabel(data.metadata)}</p>
        </>
      )}
    </section>
  );
}
