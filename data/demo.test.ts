import { describe, expect, it } from "vitest";
import { catalogById } from "@/data/catalog";
import { demoLayout, demoRoom } from "@/data/demo";
import { checkLayout } from "@/lib/geometry";

describe("demo fixture", () => {
  it("rejects only the three-seat sofa, for the door swing", () => {
    const r = checkLayout({ room: demoRoom, placements: demoLayout.placements, catalog: catalogById });
    expect(r.violations).toEqual([expect.objectContaining({ code: "door_swing", items: ["sofa", "entry"] })]);
  });

  it("passes, with a turning circle, once the loveseat replaces it", () => {
    const placements = demoLayout.placements.map((p) =>
      p.id === "sofa" ? { ...p, itemId: "sofa-loveseat", x: 75, y: 151 } : p,
    );
    const r = checkLayout({
      room: demoRoom,
      placements,
      catalog: catalogById,
      clearances: [{ kind: "turning_circle", diameter: 60 }],
    });
    expect(r.violations).toEqual([]);
    expect(r.turningCircle).toBeDefined();
  });
});
