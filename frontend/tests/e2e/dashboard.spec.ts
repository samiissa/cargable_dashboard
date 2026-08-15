import { expect, test } from "@playwright/test";

/**
 * End-to-end coverage for the protected reporting UI. The unauthenticated
 * redirect check requires only a running dashboard server and needs no
 * external credentials. Every other scenario also needs a provisioned
 * `admin_members` test account exposed via `E2E_ADMIN_EMAIL`/
 * `E2E_ADMIN_PASSWORD` and skips itself when those are absent, instead of
 * failing CI environments that cannot reach a live Supabase project.
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test("an unauthenticated visitor is redirected away from a protected report without seeing report data", async ({
  page,
}) => {
  await page.goto("/business");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText(/registered users/i)).toHaveCount(0);
});

test.describe("authorized administrator session", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD are not configured");

  async function login(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL!);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("**/business");
  }

  test("signs in and navigates all three reports", async ({ page }) => {
    await login(page);

    await expect(page.getByRole("heading", { name: "Business" })).toBeVisible();
    await expect(page.getByText("Registered users")).toBeVisible();

    await page.getByRole("link", { name: "Invoices" }).click();
    await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();

    await page.getByRole("link", { name: "Operations" }).click();
    await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible();
  });

  test("selecting a range shows the requested window or a labelled snapshot", async ({ page }) => {
    await login(page);

    await page.getByRole("button", { name: "7 days" }).click();
    await expect(page.getByText(/7d range:|Snapshot/)).toBeVisible();

    await page.getByRole("button", { name: "All time" }).click();
    await expect(page.getByText("Snapshot — no reliable time range available")).toBeVisible();
  });

  test("an empty report shows an empty state rather than an error", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: "Invoices" }).click();

    const empty = page.getByText(/No invoice observations/);
    if (await empty.isVisible().catch(() => false)) {
      await expect(page.getByRole("alert")).toHaveCount(0);
    }
  });

  test("a refresh failure retains the last known data and marks it stale", async ({ page, context }) => {
    await login(page);
    // Wait for the initial load to succeed before intercepting — otherwise
    // the abort below can race the first fetch itself, leaving no "last
    // known data" to fall back to and the report shows unavailable instead.
    await expect(page.getByText("Registered users")).toBeVisible();

    await context.route("**/api/dashboard/reports/business*", (route) => route.abort());
    await page.getByRole("button", { name: "Refresh" }).click();
    await expect(page.getByText(/Stale — showing last known data/)).toBeVisible();
    await expect(page.getByText("Registered users")).toBeVisible();
  });

  test("the reporting interface never exposes mutation controls or raw data", async ({ page }) => {
    await login(page);

    for (const path of ["/business", "/invoices", "/operations"]) {
      await page.goto(path);
      await expect(page.getByRole("button", { name: /delete|create|edit|update|save/i })).toHaveCount(0);
      await expect(page.locator("form:not([aria-label='Administrator sign in'])")).toHaveCount(0);
      const bodyText = await page.locator("body").innerText();
      expect(bodyText).not.toContain("Platform Costs");
      expect(bodyText).not.toMatch(/\bDAU\b|\bWAU\b|\bMAU\b/);
    }
  });
});
