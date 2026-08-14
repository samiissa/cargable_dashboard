import { Hono } from "hono";

import { type AppConfig, loadConfig } from "./config.js";
import { type CreateAdminMiddlewareDeps, createAdminMiddleware } from "./middleware/admin.js";
import { AppError, errorHandler, requestContext } from "./middleware/errors.js";
import { type CreateIdentityMiddlewareDeps, createIdentityMiddleware } from "./middleware/identity.js";
import { authorizationHandler } from "./routes/authorization.js";
import { businessHandler } from "./routes/business.js";
import { invoicesHandler } from "./routes/invoices.js";
import { operationsHandler } from "./routes/operations.js";

export interface CreateAppOptions {
  config?: AppConfig;
  identityDeps?: CreateIdentityMiddlewareDeps;
  adminDeps?: CreateAdminMiddlewareDeps;
}

function methodNotAllowed(): never {
  throw new AppError(405, "METHOD_NOT_ALLOWED");
}

/** Read-only Hono app: request context, identity, authorization, then GET-only routes. */
export function createApp(options: CreateAppOptions = {}): Hono {
  const config = options.config ?? loadConfig();
  const app = new Hono();

  app.onError(errorHandler);
  app.use("*", requestContext);
  app.use("*", createIdentityMiddleware(config, options.identityDeps));
  app.use("*", createAdminMiddleware(config, options.adminDeps));

  app.get("/v1/authorization", authorizationHandler);
  app.all("/v1/authorization", methodNotAllowed);

  app.get("/v1/reports/business", businessHandler);
  app.all("/v1/reports/business", methodNotAllowed);

  app.get("/v1/reports/invoices", invoicesHandler);
  app.all("/v1/reports/invoices", methodNotAllowed);

  app.get("/v1/reports/operations", operationsHandler);
  app.all("/v1/reports/operations", methodNotAllowed);

  app.notFound((): never => {
    throw new AppError(404, "NOT_FOUND");
  });

  return app;
}
