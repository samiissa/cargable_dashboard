import { createHash } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { createMiddleware } from "hono/factory";

import type { AppConfig } from "../config.js";
import { AppError } from "./errors.js";

const AUTHENTICATED_AUDIENCE = "authenticated";

declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
    bearerToken: string;
    hashedSubject: string;
  }
}

export function extractBearerToken(headerValue: string | undefined): string | undefined {
  if (!headerValue) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(headerValue.trim());
  return match?.[1];
}

function hashSubject(id: string): string {
  return createHash("sha256").update(id).digest("hex");
}

export interface CreateIdentityMiddlewareDeps {
  createSupabaseClient?: typeof createClient | undefined;
}

/**
 * Independently re-verifies the bearer token against Supabase Auth on every
 * request. Never trusts cookies or client-asserted identity — only the
 * `Authorization` header is read, and only the server-verified result is
 * used downstream.
 */
export function createIdentityMiddleware(
  config: Pick<AppConfig, "supabaseUrl" | "supabaseAnonKey">,
  deps: CreateIdentityMiddlewareDeps = {},
) {
  const createSupabaseClient = deps.createSupabaseClient ?? createClient;

  return createMiddleware(async (c, next) => {
    const token = extractBearerToken(c.req.header("Authorization"));
    if (!token) {
      throw new AppError(401, "UNAUTHENTICATED");
    }

    const client = createSupabaseClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: false },
    });

    let user: { id: string; aud: string } | null;
    try {
      const { data, error } = await client.auth.getUser(token);
      if (error || !data.user) {
        throw new AppError(401, "UNAUTHENTICATED");
      }
      user = data.user as unknown as { id: string; aud: string };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(503, "DEPENDENCY_UNAVAILABLE");
    }

    if (user.aud !== AUTHENTICATED_AUDIENCE) {
      throw new AppError(401, "CLAIMS_MISMATCH");
    }

    c.set("bearerToken", token);
    c.set("hashedSubject", hashSubject(user.id));

    await next();
  });
}
