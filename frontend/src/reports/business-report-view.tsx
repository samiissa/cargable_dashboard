"use client";

import type { BusinessReport } from "@cargable/contracts";

import type { SupportedRange } from "../api/dashboard-proxy";
import { FreshnessLabel } from "./freshness-label";
import { formatRangeLabel } from "./metadata";
import { RangeSelector } from "./range-selector";
import type { ReportStatus } from "./use-report";

export interface BusinessReportViewProps {
  data: BusinessReport | undefined;
  status: ReportStatus;
  lastUpdatedAt: Date | undefined;
  range: SupportedRange;
  onRangeChange: (range: SupportedRange) => void;
  onRefresh: () => void;
}

/** Presentational only — see `app/(protected)/business/page.tsx` for the data-fetching container. */
export function BusinessReportView({ data, status, lastUpdatedAt, range, onRangeChange, onRefresh }: BusinessReportViewProps) {
  const showData = data && (status === "ready" || status === "stale");

  return (
    <section aria-labelledby="business-report-heading">
      <h1 id="business-report-heading">Business</h1>
      <RangeSelector value={range} onChange={onRangeChange} />
      <FreshnessLabel status={status} lastUpdatedAt={lastUpdatedAt} onRefresh={onRefresh} />
      {status === "loading" && <p>Loading business report…</p>}
      {status === "unavailable" && <p role="alert">Business report is unavailable.</p>}
      {status === "empty" && <p>No business observations for this range.</p>}
      {showData && (
        <dl>
          <div>
            <dt>Registered users</dt>
            <dd>{data.registeredUsers}</dd>
          </div>
          <div>
            <dt>Active paid subscriptions (entitlement snapshot)</dt>
            <dd>{data.activePaidSubscriptions.count}</dd>
          </div>
        </dl>
      )}
      {showData && <p>{formatRangeLabel(data.metadata)}</p>}
    </section>
  );
}
