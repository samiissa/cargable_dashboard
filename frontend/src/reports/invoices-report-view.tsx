"use client";

import type { InvoicesReport } from "@cargable/contracts";

import type { SupportedRange } from "../api/dashboard-proxy";
import { FreshnessLabel } from "./freshness-label";
import { formatRangeLabel } from "./metadata";
import { RangeSelector } from "./range-selector";
import {
  footnoteClass,
  listCardClass,
  listRowClass,
  reportHeadingClass,
  reportSectionClass,
  stateErrorClass,
  stateMutedClass,
  subHeadingClass,
} from "./report-styles";
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
    <section aria-labelledby="invoices-report-heading" className={reportSectionClass}>
      <h1 id="invoices-report-heading" className={reportHeadingClass}>
        Facturas
      </h1>
      <RangeSelector value={range} onChange={onRangeChange} />
      <FreshnessLabel status={status} lastUpdatedAt={lastUpdatedAt} onRefresh={onRefresh} />
      {status === "loading" && <p className={stateMutedClass}>Cargando reporte de facturas…</p>}
      {status === "unavailable" && (
        <p role="alert" className={stateErrorClass}>
          El reporte de facturas no está disponible.
        </p>
      )}
      {status === "empty" && <p className={stateMutedClass}>No hay datos de facturas para este rango.</p>}
      {showData && (
        <>
          <div className="flex flex-col gap-2">
            <h2 className={subHeadingClass}>Estado de facturas</h2>
            <ul className={listCardClass}>
              {data.invoiceStatusCounts.map((entry) => (
                <li key={entry.status} className={listRowClass}>
                  {entry.status}: {entry.count}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className={subHeadingClass}>Canales de facturación</h2>
            <ul className={listCardClass}>
              {data.invoiceChannels.map((entry) => (
                <li key={entry.channel} className={listRowClass}>
                  {entry.channel}: {entry.count}
                </li>
              ))}
            </ul>
          </div>
          <p className={footnoteClass}>{formatRangeLabel(data.metadata)}</p>
        </>
      )}
    </section>
  );
}
