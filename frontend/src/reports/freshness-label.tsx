"use client";

import type { ReportStatus } from "./use-report";

const STATUS_LABELS: Record<ReportStatus, string> = {
  loading: "Loading…",
  ready: "Live",
  empty: "Live",
  stale: "Stale — showing last known data",
  unavailable: "Unavailable",
};

/** Fail-closed states (`unavailable`) read as errors; `stale` reads as a warning; everything else stays muted/primary. */
const STATUS_COLOR: Record<ReportStatus, string> = {
  loading: "text-onSurfaceMuted",
  ready: "text-primary",
  empty: "text-onSurfaceMuted",
  stale: "text-statusWarning",
  unavailable: "text-error",
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
    <p role="status" className="flex flex-wrap items-center gap-3 text-sm">
      <span className={`font-medium ${STATUS_COLOR[status]}`}>
        {STATUS_LABELS[status]}
        {lastUpdatedAt && status !== "loading" ? ` (last updated ${lastUpdatedAt.toLocaleTimeString()})` : null}
      </span>
      <button
        type="button"
        onClick={onRefresh}
        className="rounded-full border-[1.5px] border-surfaceBorder px-3 py-1 text-xs font-semibold text-onSurfaceMuted outline-none hover:border-primary hover:text-onSurface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
      >
        Refresh
      </button>
    </p>
  );
}
