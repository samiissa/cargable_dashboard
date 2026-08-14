"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { loadPublicSupabaseConfig } from "./public-config";

/** Browser-only client: uses the publishable anon key, never a service-role key. */
export function createSupabaseBrowserClient(): SupabaseClient {
  const config = loadPublicSupabaseConfig();
  return createBrowserClient(config.supabaseUrl, config.supabaseAnonKey);
}
