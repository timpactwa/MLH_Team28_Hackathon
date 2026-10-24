import { describe, expect, it } from "vitest";
import { catalog, catalogById } from "@/data/catalog";
import type { Opening, Placement, Room } from "@/lib/schema";
import { checkLayout, footprint, nearestFit } from "@/lib/geometry";

const m = (value: number) => ({ value, source: "confirmed" as const });

// 12 ft x 11 ft studio. Entry door on the south wall, 12 in from the west corner, 32 in wide, swings in.
function studio(door: Partial<Opening> = {}): Room {
  return {
    id: "studio",
    name: "Studio",
    width: m(144),
    depth: m(132),
    height: m(96),
    openings: [
      { id: "entry", kind: "door", wall: "south", offset: m(12), width: m(32), swing: "in", hinge: "start", ...door },
      { id: "win", kind: "window", wall: "north", offset: m(50), width: m(40), swing: "none", hinge: "start" },
    ],
  };
}

const at = (id: string, itemId: string, x: number, y: number, rotation: Placement["rotation"] = 0): Placement => ({
  id,
  itemId,
  x,
  y,
  rotation,
});

const check = (room: Room, placements: Placement[], clearances = [] as Parameters<typeof checkLayout>[0]["clearances"]) =>
  checkLayout({ room, placements, catalog: catalogById, clearances });

describe("catalog", () => {
  it("has unique ids and 12-20 items", () => {
    expect(new Set(catalog.map((c) => c.id)).size).toBe(catalog.length);
    expect(catalog.length).toBeGreaterThanOrEqual(12);
    expect(catalog.length).toBeLessThanOrEqual(20);
  });
});

describe("footprint", () => {
  it("swaps width and depth at 90 and 270 degrees", () => {
    const sofa = catalogById.get("sofa-3seat")!;
    expect(footprint(at("s", "sofa-3seat", 50, 50, 0), sofa)).toMatchObject({ minX: 8, maxX: 92, minY: 32, maxY: 68 });
    expect(footprint(at("s", "sofa-3seat", 50, 50, 90), sofa)).toMatchObject({ minX: 32, maxX: 68, minY: 8, maxY: 92 });
  });
});

describe("checkLayout", () => {
  it("demo case: the three-seat sofa blocks the door swing, the loveseat fits", () => {
    // Sofa against the south wall, spanning x 30..114. Hinge at (12, 132); nearest sofa point is 18 in away.
    const bad = check(studio(), [at("sofa", "sofa-3seat", 72, 114)]);
    expect(bad.ok).toBe(false);
    expect(bad.violations).toHaveLength(1);
    expect(bad.violations[0]).toMatchObject({ code: "door_swing", items: ["sofa", "entry"], overlapIn: 14 });
    expect(bad.violations[0].message).toContain("Three-seat sofa");

    // Loveseat spanning x 46..104 clears the swing.
    expect(check(studio(), [at("sofa", "sofa-loveseat", 75, 115)]).ok).toBe(true);
  });

  it("allows furniture in the door's path when it swings out", () => {
    expect(check(studio({ swing: "out" }), [at("sofa", "sofa-3seat", 72, 114)]).ok).toBe(true);
  });

  it("measures the swing from the hinge end", () => {
    // Hinge at the east end (44, 132): the sofa's west edge at x 30 is inside the 32 in radius.
    const r = check(studio({ hinge: "end" }), [at("sofa", "sofa-3seat", 72, 114)]);
    expect(r.violations[0]).toMatchObject({ code: "door_swing" });
    expect(r.violations[0].overlapIn).toBeGreaterThan(14);
  });

  it("does not flag the corner of the swing square the door never reaches", () => {
    // An 8 x 6 in item at (36..44, 100..106) is inside the swing's bounding square, but its nearest
    // point to the hinge at (12, 132) is about 35.4 in away, outside the 32 in arc.
    const tiny = { ...catalogById.get("nightstand")!, id: "tiny", width: 8, depth: 6 };
    const cat = new Map(catalogById).set("tiny", tiny);
    const r = checkLayout({ room: studio(), placements: [at("t", "tiny", 40, 103)], catalog: cat });
    expect(r.ok).toBe(true);
  });

  it("flags overlap with the penetration distance", () => {
    const r = check(studio(), [at("bed", "bed-full", 28, 38.5), at("desk", "desk-compact", 66, 10)]);
    expect(r.violations).toEqual([expect.objectContaining({ code: "overlap", items: ["bed", "desk"], overlapIn: 10 })]);
  });

  it("allows furniture that only touches", () => {
    expect(check(studio(), [at("bed", "bed-full", 28, 38.5), at("ns", "nightstand", 66, 8)]).ok).toBe(true);
  });

  it("flags items past the walls", () => {
    const r = check(studio(), [at("bed", "bed-full", 20, 38.5)]);
    expect(r.violations[0]).toMatchObject({ code: "out_of_bounds", overlapIn: 8 });
  });

  it("flags unknown catalog items", () => {
    expect(check(studio(), [at("x", "hot-tub", 50, 50)]).violations[0].code).toBe("unknown_item");
  });

  it("enforces a clear space in front of doors when requested", () => {
    // Bookshelf at x 14..46, y 84..96: beyond the 32 in swing, but 12 in inside a 48 in clear zone.
    const shelf = at("shelf", "bookshelf", 30, 90, 0);
    expect(check(studio(), [shelf]).ok).toBe(true);
    const r = check(studio(), [shelf], [{ kind: "door_clearance", depth: 48 }]);
    expect(r.violations).toEqual([expect.objectContaining({ code: "door_clearance", overlapIn: 12 })]);
  });

  it("finds a 60 in turning circle in an open studio and reports where", () => {
    const r = check(studio(), [at("bed", "bed-full", 28, 38.5)], [{ kind: "turning_circle", diameter: 60 }]);
    expect(r.ok).toBe(true);
    expect(r.turningCircle?.r).toBe(30);
    const c = r.turningCircle!;
    expect(c.x - c.r).toBeGreaterThanOrEqual(56); // clear of the bed's east edge
  });

  it("reports no turning space when the floor is full", () => {
    const placements = [
      at("bed", "bed-queen", 31, 41),
      at("sofa", "sofa-3seat", 102, 18),
      at("table", "table-dining-4", 110, 70),
      at("desk", "desk-standard", 110, 120),
      at("dresser", "dresser-6", 50, 123),
    ];
    const r = check(studio({ swing: "out" }), placements, [{ kind: "turning_circle", diameter: 60 }]);
    expect(r.violations.map((v) => v.code)).toContain("no_turning_space");
    expect(r.turningCircle).toBeUndefined();
  });
});

describe("nearestFit", () => {
  it("slides the loveseat just clear of the door swing", () => {
    const input = { room: studio(), placements: [at("sofa", "sofa-loveseat", 72, 114)], catalog: catalogById };
    expect(check(input.room, input.placements).ok).toBe(false);
    const spot = nearestFit(input, "sofa")!;
    expect(spot).toEqual({ x: 73, y: 114 });
    expect(check(input.room, [at("sofa", "sofa-loveseat", spot.x, spot.y)]).ok).toBe(true);
  });

  it("returns null when nothing nearby works", () => {
    const tiny: Room = { ...studio(), width: m(40), depth: m(40), openings: [] };
    expect(nearestFit({ room: tiny, placements: [at("b", "bed-queen", 20, 20)], catalog: catalogById }, "b", 5)).toBeNull();
  });
});
