"use client";

import type { OperationsReport } from "@cargable/contracts";

import type { SupportedRange } from "../api/dashboard-proxy";
import { FreshnessLabel } from "./freshness-label";
import { formatAge, formatRangeLabel } from "./metadata";
import { RangeSelector } from "./range-selector";
import {
  cardClass,
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
    <section aria-labelledby="operations-report-heading" className={reportSectionClass}>
      <h1 id="operations-report-heading" className={reportHeadingClass}>
        Operaciones
      </h1>
      <RangeSelector value={range} onChange={onRangeChange} />
      <FreshnessLabel status={status} lastUpdatedAt={lastUpdatedAt} onRefresh={onRefresh} />
      {status === "loading" && <p className={stateMutedClass}>Cargando reporte de operaciones…</p>}
      {status === "unavailable" && (
        <p role="alert" className={stateErrorClass}>
          El reporte de operaciones no está disponible.
        </p>
      )}
      {status === "empty" && <p className={stateMutedClass}>No hay datos de operaciones para este rango.</p>}
      {showData && (
        <>
          <div className="flex flex-col gap-2">
            <h2 className={subHeadingClass}>Estado de la cola</h2>
            <ul className={listCardClass}>
              {data.queueStatusCounts.map((entry) => (
                <li key={entry.status} className={listRowClass}>
                  {entry.status}: {entry.count}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className={subHeadingClass}>Estado del reporte mensual</h2>
            <ul className={listCardClass}>
              {data.monthlyReportStatusCounts.map((entry) => (
                <li key={entry.status} className={listRowClass}>
                  {entry.status}: {entry.count}
                </li>
              ))}
            </ul>
          </div>
          <p className={cardClass}>Alertas sin resolver (instantánea): {data.unresolvedAlerts.count}</p>
          <details className={listCardClass}>
            <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-onSurface">
              Fallos terminales ({data.terminalFailures.length})
            </summary>
            <ul className="divide-y divide-surfaceBorder">
              {data.terminalFailures.map((failure, index) => (
                <li key={index} className={listRowClass}>
                  {failure.jobType} — antigüedad {formatAge(failure.ageSeconds)}, intentos {failure.attempts}
                </li>
              ))}
            </ul>
          </details>
          <p className={footnoteClass}>{formatRangeLabel(data.metadata)}</p>
        </>
      )}
    </section>
  );
}
