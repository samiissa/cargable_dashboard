"use client";

import type { SupportedRange } from "../api/dashboard-proxy";

const RANGE_LABELS: Record<SupportedRange, string> = { "7d": "7 days", "30d": "30 days", all: "All time" };

export function RangeSelector({
  value,
  onChange,
}: {
  value: SupportedRange;
  onChange: (range: SupportedRange) => void;
}) {
  return (
    <div role="group" aria-label="Select report range">
      {(Object.keys(RANGE_LABELS) as SupportedRange[]).map((range) => (
        <button
          key={range}
          type="button"
          aria-pressed={value === range}
          onClick={() => onChange(range)}
        >
          {RANGE_LABELS[range]}
        </button>
      ))}
    </div>
  );
}
