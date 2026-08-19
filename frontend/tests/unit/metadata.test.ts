import { describe, expect, it } from "vitest";

import { formatAge } from "../../src/reports/metadata";

describe("formatAge", () => {
  it("renders sub-minute ages in seconds", () => {
    expect(formatAge(45)).toBe("45 s");
  });

  it("renders sub-hour ages in minutes", () => {
    expect(formatAge(300)).toBe("5 min");
  });

  it("renders sub-day ages in hours", () => {
    expect(formatAge(7200)).toBe("2 h");
  });

  it("renders multi-day ages as days and remaining hours, not raw seconds", () => {
    // Regression: a terminal failure this old previously rendered as "2970860s",
    // an unreadable raw duration a human can't judge severity from at a glance.
    expect(formatAge(2970860)).toBe("34 d 9 h");
    expect(formatAge(3483395)).toBe("40 d 7 h");
  });
});
