import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "./supabase-server";

export type VerifiedSession = { authenticated: true; accessToken: string } | { authenticated: false };

export interface VerifySessionDeps {
  createClient?: (cookieHeader: string | null) => SupabaseClient;
}

/**
 * Verifies the caller's identity server-side via `getClaims()` — falling
 * back to `getUser()` when claims verification is unavailable — and only
 * afterward extracts the raw access token via `getSession()` for backend
 * forwarding. Session/cookie data is never trusted before verification
 * succeeds, and no token is ever returned for an unverified session.
 */
export async function verifySession(
  cookieHeader: string | null,
  deps: VerifySessionDeps = {},
): Promise<VerifiedSession> {
  const createClient = deps.createClient ?? createSupabaseServerClient;
  const client = createClient(cookieHeader);

  if (!(await isVerified(client))) {
    return { authenticated: false };
  }

  const { data, error } = await client.auth.getSession();
  if (error || !data.session?.access_token) {
    return { authenticated: false };
  }

  return { authenticated: true, accessToken: data.session.access_token };
}

async function isVerified(client: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await client.auth.getClaims();
    if (!error && data) return true;
  } catch {
    // getClaims() can throw when local JWKS validation is unavailable; fall back to getUser().
  }

  try {
    const { data, error } = await client.auth.getUser();
    return !error && !!data.user;
  } catch {
    return false;
  }
}
