import { authorizationSchema, type Authorization } from "@cargable/contracts";
import { createClient } from "@supabase/supabase-js";
import { createMiddleware } from "hono/factory";

import type { AppConfig } from "../config.js";
import { createCargableRpcCaller, RpcCallError, type RpcCaller, toAppError } from "../services/cargable-rpc.js";

declare module "hono" {
  interface ContextVariableMap {
    rpcCaller: RpcCaller;
    authorization: Authorization;
  }
}

export interface CreateAdminMiddlewareDeps {
  createSupabaseClient?: typeof createClient | undefined;
}

/**
 * Determines current `admin_members` authorization by calling the
 * allowlisted authorization RPC with the verified bearer token. Fails
 * closed: any denial or dependency failure stops the request before it
 * reaches route handlers, and no report data is ever computed.
 */
export function createAdminMiddleware(
  config: Pick<AppConfig, "supabaseUrl" | "supabaseAnonKey">,
  deps: CreateAdminMiddlewareDeps = {},
) {
  return createMiddleware(async (c, next) => {
    const bearerToken = c.get("bearerToken");
    const callRpc = createCargableRpcCaller({
      config,
      bearerToken,
      createSupabaseClient: deps.createSupabaseClient,
    });

    try {
      const authorization = await callRpc("admin_dashboard_authorization_v1", {}, authorizationSchema);
      c.set("authorization", authorization);
    } catch (err) {
      if (err instanceof RpcCallError) {
        throw toAppError(err);
      }
      throw err;
    }

    c.set("rpcCaller", callRpc);
    await next();
  });
}
