"use client";

import type { SupportedRange } from "../api/dashboard-proxy";

const RANGE_LABELS: Record<SupportedRange, string> = { "7d": "7 días", "30d": "30 días", all: "Todo el tiempo" };

const pillBaseClass =
  "rounded-full px-4 py-1.5 text-sm font-semibold outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2";

export function RangeSelector({
  value,
  onChange,
}: {
  value: SupportedRange;
  onChange: (range: SupportedRange) => void;
}) {
  return (
    <div role="group" aria-label="Seleccionar rango del reporte" className="flex gap-2">
      {(Object.keys(RANGE_LABELS) as SupportedRange[]).map((range) => (
        <button
          key={range}
          type="button"
          aria-pressed={value === range}
          onClick={() => onChange(range)}
          className={`${pillBaseClass} ${
            value === range
              ? "bg-primary text-onPrimary"
              : "border-[1.5px] border-surfaceBorder text-onSurfaceMuted hover:text-onSurface"
          }`}
        >
          {RANGE_LABELS[range]}
        </button>
      ))}
    </div>
  );
}
