import { describe, expect, it } from "vitest";
import { Layout, Needs, Opening, Room, toJsonSchema } from "@/lib/schema";

describe("schema", () => {
  it("defaults door swing and hinge", () => {
    const door = Opening.parse({
      id: "d1",
      kind: "door",
      wall: "south",
      offset: { value: 10, source: "estimated" },
      width: { value: 32, source: "confirmed" },
    });
    expect(door.swing).toBe("in");
    expect(door.hinge).toBe("start");
  });

  it("rejects non-right-angle rotations and negative sizes", () => {
    const placement = { id: "p1", itemId: "bed-full", x: 40, y: 40, rotation: 45 };
    expect(Layout.safeParse({ id: "a", name: "A", rationale: "", placements: [placement] }).success).toBe(false);
    expect(
      Room.safeParse({
        id: "r",
        name: "R",
        width: { value: -1, source: "confirmed" },
        depth: { value: 100, source: "confirmed" },
        height: { value: 96, source: "confirmed" },
        openings: [],
      }).success,
    ).toBe(false);
  });

  it("emits JSON Schema for model structured output", () => {
    const schema = toJsonSchema(Needs);
    expect(schema.type).toBe("object");
    expect(JSON.stringify(toJsonSchema(Layout))).toContain("rotation");
  });
});
