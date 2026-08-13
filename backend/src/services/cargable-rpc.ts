import { createClient } from "@supabase/supabase-js";
import type { ZodType } from "zod";

import type { AppConfig } from "../config.js";
import { AppError } from "../middleware/errors.js";

/** The only RPCs this backend is ever allowed to invoke. Never accept an RPC name from request input. */
export const ALLOWLISTED_RPCS = [
  "admin_dashboard_authorization_v1",
  "admin_dashboard_business_v1",
  "admin_dashboard_invoices_v1",
  "admin_dashboard_operations_v1",
] as const;
export type AllowlistedRpc = (typeof ALLOWLISTED_RPCS)[number];

export const SUPPORTED_RANGES = ["7d", "30d", "all"] as const;
export type Range = (typeof SUPPORTED_RANGES)[number];
const DEFAULT_RANGE: Range = "30d";

export type RpcFailureKind = "forbidden" | "dependency_failure" | "timeout" | "invalid_range" | "invalid_response";

/** A Postgres SQLSTATE for insufficient privilege — the admin RPCs raise this on non-member/revoked access. */
const POSTGRES_INSUFFICIENT_PRIVILEGE = "42501";
const RPC_TIMEOUT_MS = 8000;

export class RpcCallError extends Error {
  readonly kind: RpcFailureKind;

  constructor(kind: RpcFailureKind, message: string) {
    super(message);
    this.name = "RpcCallError";
    this.kind = kind;
  }
}

/** Maps a fail-closed RPC failure to the sanitized HTTP response the client sees. Shared by admin authorization and report route handlers. */
export function toAppError(err: RpcCallError): AppError {
  switch (err.kind) {
    case "forbidden":
      return new AppError(403, "FORBIDDEN");
    case "timeout":
      return new AppError(504, "DEPENDENCY_TIMEOUT");
    case "invalid_response":
      return new AppError(502, "UPSTREAM_INVALID");
    case "invalid_range":
      return new AppError(400, "INVALID_RANGE");
    case "dependency_failure":
    default:
      return new AppError(503, "DEPENDENCY_UNAVAILABLE");
  }
}

/** Validates a `range` query parameter against the contract's supported values, defaulting when absent. */
export function parseRange(raw: string | undefined): Range {
  const value = raw ?? DEFAULT_RANGE;
  if (!(SUPPORTED_RANGES as readonly string[]).includes(value)) {
    throw new RpcCallError("invalid_range", `unsupported range: ${value}`);
  }
  return value as Range;
}

export type RpcCaller = <T>(name: AllowlistedRpc, args: Record<string, unknown>, schema: ZodType<T>) => Promise<T>;

export interface CreateCargableRpcCallerOptions {
  config: Pick<AppConfig, "supabaseUrl" | "supabaseAnonKey">;
  bearerToken: string;
  createSupabaseClient?: typeof createClient | undefined;
}

function timeoutAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new RpcCallError("timeout", "rpc call timed out")), ms);
  });
}

/**
 * Builds a per-request RPC caller scoped to the verified user's bearer
 * token — anon/publishable key only, never a service-role key. Enforces
 * the RPC allowlist at runtime, an 8-second fail-closed timeout, and
 * schema validation of every upstream response before returning it.
 */
export function createCargableRpcCaller({
  config,
  bearerToken,
  createSupabaseClient = createClient,
}: CreateCargableRpcCallerOptions): RpcCaller {
  const client = createSupabaseClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${bearerToken}` } },
    auth: { persistSession: false },
  });

  return async function callRpc(name, args = {}, schema) {
    if (!(ALLOWLISTED_RPCS as readonly string[]).includes(name)) {
      throw new RpcCallError("dependency_failure", "RPC is not allowlisted");
    }

    let result: { data: unknown; error: { code?: string; message: string } | null };
    try {
      result = await Promise.race([client.rpc(name, args), timeoutAfter(RPC_TIMEOUT_MS)]);
    } catch (err) {
      if (err instanceof RpcCallError) throw err;
      throw new RpcCallError("dependency_failure", "rpc call failed");
    }

    if (result.error) {
      if (result.error.code === POSTGRES_INSUFFICIENT_PRIVILEGE) {
        throw new RpcCallError("forbidden", "access denied");
      }
      throw new RpcCallError("dependency_failure", "rpc call failed");
    }

    const parsed = schema.safeParse(result.data);
    if (!parsed.success) {
      throw new RpcCallError("invalid_response", "upstream response failed contract validation");
    }

    return parsed.data;
  };
}
