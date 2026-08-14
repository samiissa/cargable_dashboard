import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { dashboardConfig } from "./config";

function parseCookieHeader(header: string | null): { name: string; value: string }[] {
  if (!header) return [];
  return header
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const eq = pair.indexOf("=");
      const name = eq === -1 ? pair : pair.slice(0, eq);
      const value = eq === -1 ? "" : decodeURIComponent(pair.slice(eq + 1));
      return { name, value };
    });
}

/**
 * Builds a per-request, read-only Supabase server client from an incoming
 * `Cookie` header. This client never mutates cookies — it exists only to
 * independently re-verify the caller's identity, never to trust it.
 */
export function createSupabaseServerClient(cookieHeader: string | null): SupabaseClient {
  const config = dashboardConfig();
  return createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
    cookies: {
      getAll: () => parseCookieHeader(cookieHeader),
      setAll: () => {
        // Read-only verification client: session refresh cookies are never written here.
      },
    },
  });
}
