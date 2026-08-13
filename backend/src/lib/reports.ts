import type { Context } from "hono";
import type { ZodType } from "zod";

import { type AllowlistedRpc, parseRange, RpcCallError, toAppError } from "../services/cargable-rpc.js";

/**
 * Builds a thin GET handler for a range-scoped report: validates the
 * requested range, calls the allowlisted RPC through the caller the admin
 * middleware already verified, and returns only the schema-validated DTO.
 */
export function createReportHandler<T>(rpcName: AllowlistedRpc, schema: ZodType<T>) {
  return async (c: Context) => {
    let range;
    try {
      range = parseRange(c.req.query("range"));
    } catch (err) {
      throw err instanceof RpcCallError ? toAppError(err) : err;
    }

    const caller = c.get("rpcCaller");
    try {
      const data = await caller(rpcName, { p_range: range }, schema);
      return c.json(data);
    } catch (err) {
      throw err instanceof RpcCallError ? toAppError(err) : err;
    }
  };
}
