import type { z } from "zod";

import {
  authorizationSchema,
  businessReportSchema,
  invoicesReportSchema,
  operationsReportSchema,
} from "./generated/schema.js";

export { authorizationSchema, businessReportSchema, invoicesReportSchema, operationsReportSchema };
export type Authorization = z.infer<typeof authorizationSchema>;
export type BusinessReport = z.infer<typeof businessReportSchema>;
export type InvoicesReport = z.infer<typeof invoicesReportSchema>;
export type OperationsReport = z.infer<typeof operationsReportSchema>;

export type { Provenance, ProvenanceOverrides } from "./provenance.js";
export { validateProvenance } from "./provenance.js";
