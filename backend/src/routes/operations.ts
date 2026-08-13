import { operationsReportSchema } from "@cargable/contracts";

import { createReportHandler } from "../lib/reports.js";

export const operationsHandler = createReportHandler("admin_dashboard_operations_v1", operationsReportSchema);
