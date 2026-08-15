import { defineConfig, devices } from "@playwright/test";

/**
 * Browser harness scaffold for the dashboard. Requires `next dev` (or a
 * built server) on `PLAYWRIGHT_BASE_URL`/`http://localhost:3000` plus
 * downloaded browser binaries (`playwright install`) — neither is available
 * in every environment this repository is developed from, so this config is
 * present for local/CI use and is not exercised as part of `pnpm test`.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  // Assertions here can wait on a real proxy -> backend -> Supabase RPC
  // round trip, not a mock — Playwright's 5s default is too tight for that
  // in dev mode. 15s stays well under each test's own timeout.
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
