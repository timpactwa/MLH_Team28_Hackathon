import { describe, expect, it } from "vitest";
import { fitLabel } from "./PlanView";

describe("fitLabel", () => {
  it("keeps short names on one horizontal line at full size", () => {
    expect(fitLabel("Full bed", 56, 77)).toEqual({ lines: ["Full bed"], size: 5.5, vertical: false });
  });

  it("wraps a long name in a small square box instead of shrinking it to nothing", () => {
    const fit = fitLabel("Two-seat bistro table", 30, 30);
    expect(fit.lines).toEqual(["Two-seat", "bistro table"]);
    expect(fit.size).toBeGreaterThan(3.5);
  });

  it("turns the label to run along a tall, narrow box", () => {
    expect(fitLabel("Compact desk", 20, 40).vertical).toBe(true);
  });
});
