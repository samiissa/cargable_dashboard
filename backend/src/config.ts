import { z } from "zod";

/** Pinned provider revision from packages/contracts/source.json — keep in sync when the contract is re-pinned. */
export const CONTRACT_SHA = "bf5a2f6b4bf11c18cb7c3ed6c5a38ec604be3b55";

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
});

export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  contractSha: string;
}

/**
 * Validates the server-only Supabase environment once, at startup. Fails
 * closed: an invalid or missing configuration throws rather than falling
 * back to a default that could silently disable identity verification.
 */
export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error("Invalid backend configuration: SUPABASE_URL and SUPABASE_ANON_KEY are required");
  }
  return {
    supabaseUrl: parsed.data.SUPABASE_URL,
    supabaseAnonKey: parsed.data.SUPABASE_ANON_KEY,
    contractSha: CONTRACT_SHA,
  };
}
