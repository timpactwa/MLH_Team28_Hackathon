import { describe, expect, it } from "vitest";
import { z } from "zod";

// Smoke test from T-002: proves vitest, the @ alias root and zod resolve.
describe("scaffold", () => {
  it("runs vitest with zod", () => {
    expect(z.number().positive().parse(120)).toBe(120);
  });
});
