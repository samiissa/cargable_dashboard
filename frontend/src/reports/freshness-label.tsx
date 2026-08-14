"use client";

import type { ReportStatus } from "./use-report";

const STATUS_LABELS: Record<ReportStatus, string> = {
  loading: "Loading…",
  ready: "Live",
  empty: "Live",
  stale: "Stale — showing last known data",
  unavailable: "Unavailable",
};

export function FreshnessLabel({
  status,
  lastUpdatedAt,
  onRefresh,
}: {
  status: ReportStatus;
  lastUpdatedAt: Date | undefined;
  onRefresh: () => void;
}) {
  return (
    <p role="status">
      {STATUS_LABELS[status]}
      {lastUpdatedAt && status !== "loading" ? ` (last updated ${lastUpdatedAt.toLocaleTimeString()})` : null}{" "}
      <button type="button" onClick={onRefresh}>
        Refresh
      </button>
    </p>
  );
}
