import type { Context } from "hono";

/** The admin middleware already validated this via the allowlisted authorization RPC. */
export function authorizationHandler(c: Context) {
  return c.json(c.get("authorization"));
}
