import { z } from "zod";

import { loadPublicSupabaseConfig, type PublicSupabaseConfig } from "./public-config";

const backendEnvSchema = z.object({
  DASHBOARD_BACKEND_URL: z.string().url(),
});

export interface DashboardConfig extends PublicSupabaseConfig {
  /** Server-only. Never imported by a "use client" module or exposed to the browser. */
  backendUrl: string;
}

/**
 * Validates the full server-only frontend configuration once, at request
 * setup. Fails closed: an invalid or missing configuration throws rather
 * than silently disabling identity verification or the backend proxy.
 */
export function loadDashboardConfig(env: Record<string, string | undefined> = process.env): DashboardConfig {
  const publicConfig = loadPublicSupabaseConfig(env);
  const parsed = backendEnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error("Invalid frontend configuration: DASHBOARD_BACKEND_URL is required");
  }
  return { ...publicConfig, backendUrl: parsed.data.DASHBOARD_BACKEND_URL };
}

export function dashboardConfig(): DashboardConfig {
  return loadDashboardConfig();
}
