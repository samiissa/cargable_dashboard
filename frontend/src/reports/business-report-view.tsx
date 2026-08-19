"use client";

import type { BusinessReport } from "@cargable/contracts";

import type { SupportedRange } from "../api/dashboard-proxy";
import { FreshnessLabel } from "./freshness-label";
import { formatRangeLabel } from "./metadata";
import { RangeSelector } from "./range-selector";
import {
  cardClass,
  footnoteClass,
  reportHeadingClass,
  reportSectionClass,
  stateErrorClass,
  stateMutedClass,
  statLabelClass,
  statValueClass,
} from "./report-styles";
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
    <section aria-labelledby="business-report-heading" className={reportSectionClass}>
      <h1 id="business-report-heading" className={reportHeadingClass}>
        Negocio
      </h1>
      <RangeSelector value={range} onChange={onRangeChange} />
      <FreshnessLabel status={status} lastUpdatedAt={lastUpdatedAt} onRefresh={onRefresh} />
      {status === "loading" && <p className={stateMutedClass}>Cargando reporte de negocio…</p>}
      {status === "unavailable" && (
        <p role="alert" className={stateErrorClass}>
          El reporte de negocio no está disponible.
        </p>
      )}
      {status === "empty" && <p className={stateMutedClass}>No hay datos de negocio para este rango.</p>}
      {showData && (
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={cardClass}>
            <dt className={statLabelClass}>Usuarios registrados</dt>
            <dd className={statValueClass}>{data.registeredUsers}</dd>
          </div>
          <div className={cardClass}>
            <dt className={statLabelClass}>Suscripciones de pago activas (instantánea de derechos)</dt>
            <dd className={statValueClass}>{data.activePaidSubscriptions.count}</dd>
          </div>
        </dl>
      )}
      {showData && <p className={footnoteClass}>{formatRangeLabel(data.metadata)}</p>}
    </section>
  );
}
