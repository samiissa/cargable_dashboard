"use client";

import { businessReportSchema, type BusinessReport } from "@cargable/contracts";
import { useState } from "react";

import type { SupportedRange } from "../../../src/api/dashboard-proxy";
import { BusinessReportView } from "../../../src/reports/business-report-view";
import { useReport } from "../../../src/reports/use-report";

function isEmptyBusiness(data: BusinessReport): boolean {
  return data.registeredUsers === 0 && data.activePaidSubscriptions.count === 0;
}

export default function BusinessPage() {
  const [range, setRange] = useState<SupportedRange>("30d");
  const { data, status, lastUpdatedAt, refresh } = useReport({
    path: "reports/business",
    range,
    schema: businessReportSchema,
    isEmpty: isEmptyBusiness,
  });

  return (
    <BusinessReportView
      data={data}
      status={status}
      lastUpdatedAt={lastUpdatedAt}
      range={range}
      onRangeChange={setRange}
      onRefresh={refresh}
    />
  );
}
