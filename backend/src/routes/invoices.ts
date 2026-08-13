import { invoicesReportSchema } from "@cargable/contracts";

import { createReportHandler } from "../lib/reports.js";

export const invoicesHandler = createReportHandler("admin_dashboard_invoices_v1", invoicesReportSchema);
