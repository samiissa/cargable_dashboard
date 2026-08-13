import { businessReportSchema } from "@cargable/contracts";

import { createReportHandler } from "../lib/reports.js";

export const businessHandler = createReportHandler("admin_dashboard_business_v1", businessReportSchema);
