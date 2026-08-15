import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export interface PublicSupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * Validates the browser-safe Supabase configuration once. Both values are
 * the publishable anon key and project URL — safe to inline into the client
 * bundle via `NEXT_PUBLIC_*`. Never add a server-only secret here.
 *
 * The default reads each variable through its own literal
 * `process.env.NEXT_PUBLIC_*` member expression rather than passing the
 * whole `process.env` object through. Next.js only inlines env vars into
 * the client bundle when it can statically find that exact literal access —
 * a generic `= process.env` default never gets replaced, so every browser
 * build would see an empty object and fail this validation.
 */
export function loadPublicSupabaseConfig(
  env: Record<string, string | undefined> = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
): PublicSupabaseConfig {
  const parsed = publicEnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      "Invalid public Supabase configuration: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required",
    );
  }
  return {
    supabaseUrl: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}
