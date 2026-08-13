import { randomUUID } from "node:crypto";

import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { CONTRACT_SHA } from "../config.js";

/** A stable, machine-readable, sanitized failure. Never carries raw exception text. */
export class AppError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: string;

  constructor(status: ContentfulStatusCode, code: string) {
    super(code);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export interface StructuredLogFields {
  requestId: string;
  route: string;
  status: number;
  latencyMs: number;
  contractSha: string;
  hashedSubject?: string | undefined;
}

/** Structured JSON logging only — never tokens, PII, DTO bodies, or raw exceptions. */
export function logStructured(fields: StructuredLogFields): void {
  console.log(JSON.stringify({ ...fields, ts: new Date().toISOString() }));
}

declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
  }
}

/**
 * Request context: assigns a request ID, sets the fail-closed no-store
 * header, and emits one structured log line per request once the response
 * (success or error-handled) is finalized. Register before identity and
 * authorization middleware.
 */
export const requestContext = createMiddleware(async (c, next) => {
  const requestId = randomUUID();
  const start = Date.now();
  c.set("requestId", requestId);
  c.header("Cache-Control", "private, no-store");

  await next();

  logStructured({
    requestId,
    route: c.req.path,
    status: c.res.status,
    latencyMs: Date.now() - start,
    contractSha: CONTRACT_SHA,
    hashedSubject: c.get("hashedSubject") as string | undefined,
  });
});

/**
 * The single app-level error boundary (registered via `app.onError`). Hono
 * resolves thrown errors at the frame where they occur, so this — not a
 * try/catch wrapped around `next()` — is the only place that reliably sees
 * every thrown error in the middleware chain.
 */
export function errorHandler(err: Error, c: Context) {
  const appError = err instanceof AppError ? err : new AppError(500, "INTERNAL_ERROR");
  const requestId = (c.get("requestId") as string | undefined) ?? randomUUID();
  c.header("Cache-Control", "private, no-store");
  return c.json({ error: { code: appError.code, requestId } }, appError.status);
}
