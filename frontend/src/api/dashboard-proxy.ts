import type { SupabaseClient } from "@supabase/supabase-js";

import { dashboardConfig, type DashboardConfig } from "../auth/config";
import { verifySession } from "../auth/session";

export const SUPPORTED_RANGES = ["7d", "30d", "all"] as const;
export type SupportedRange = (typeof SUPPORTED_RANGES)[number];

interface AllowlistedRoute {
  backendPath: string;
  supportsRange: boolean;
}

/** The only backend paths this proxy is ever allowed to forward to. Never accept a path from request input. */
const ALLOWLISTED_ROUTES: Record<string, AllowlistedRoute> = {
  authorization: { backendPath: "/v1/authorization", supportsRange: false },
  "reports/business": { backendPath: "/v1/reports/business", supportsRange: true },
  "reports/invoices": { backendPath: "/v1/reports/invoices", supportsRange: true },
  "reports/operations": { backendPath: "/v1/reports/operations", supportsRange: true },
};

export interface DashboardProxyDeps {
  config?: DashboardConfig;
  fetchBackend?: typeof fetch;
  createSupabaseClient?: (cookieHeader: string | null) => SupabaseClient;
}

function sanitizedJson(status: number, code: string): Response {
  return new Response(JSON.stringify({ error: { code } }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });
}

/**
 * Thin same-origin token proxy: verifies the caller's session, allowlists
 * the requested report path/method/range, and forwards only a verified
 * bearer token to the backend. Implements no report business logic — the
 * backend already validates and redacts every response it returns.
 */
export async function handleDashboardProxy(
  request: Request,
  pathSegments: string[],
  deps: DashboardProxyDeps = {},
): Promise<Response> {
  const route = ALLOWLISTED_ROUTES[pathSegments.join("/")];
  if (!route) {
    return sanitizedJson(404, "NOT_FOUND");
  }

  const session = await verifySession(
    request.headers.get("cookie"),
    deps.createSupabaseClient ? { createClient: deps.createSupabaseClient } : {},
  );
  if (!session.authenticated) {
    return sanitizedJson(401, "UNAUTHENTICATED");
  }

  if (request.method !== "GET") {
    return sanitizedJson(405, "METHOD_NOT_ALLOWED");
  }

  let rangeQuery = "";
  if (route.supportsRange) {
    const requestedRange = new URL(request.url).searchParams.get("range");
    if (requestedRange !== null) {
      if (!(SUPPORTED_RANGES as readonly string[]).includes(requestedRange)) {
        return sanitizedJson(400, "INVALID_RANGE");
      }
      rangeQuery = `?range=${requestedRange}`;
    }
  }

  const config = deps.config ?? dashboardConfig();
  const fetchBackend = deps.fetchBackend ?? fetch;
  const backendUrl = `${config.backendUrl}${route.backendPath}${rangeQuery}`;

  let upstream: Response;
  try {
    upstream = await fetchBackend(backendUrl, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: "no-store",
    });
  } catch {
    return sanitizedJson(503, "DEPENDENCY_UNAVAILABLE");
  }

  let body: unknown;
  try {
    body = await upstream.json();
  } catch {
    return sanitizedJson(502, "UPSTREAM_INVALID");
  }

  return new Response(JSON.stringify(body), {
    status: upstream.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });
}
