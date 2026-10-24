import { describe, expect, it } from "vitest";
import { catalogById } from "@/data/catalog";
import { demoRoom } from "@/data/demo";
import { checkLayout } from "@/lib/geometry";
import { autoPlace } from "./autoPlace";
import { exampleApplies, exampleNeeds, examplePlan } from "./example";

describe("prepared example plan", () => {
  const { options } = examplePlan();

  it("option 1 is rejected for the door swing, then fixed", () => {
    const [first, second] = options[0].attempts;
    expect(first.check.violations.map((v) => v.code)).toEqual(["door_swing"]);
    expect(second.check.ok).toBe(true);
    expect(options[0].status).toBe("fits");
    expect(options[0].check.turningCircle).toBeDefined();
  });

  it("option 2 passes on the first round", () => {
    expect(options[1].attempts).toHaveLength(1);
    expect(options[1].status).toBe("fits");
  });

  it("only applies to the example room and furniture", () => {
    expect(exampleApplies(demoRoom, exampleNeeds)).toBe(true);
    expect(exampleApplies({ ...demoRoom, width: { value: 120, source: "confirmed" } }, exampleNeeds)).toBe(false);
    expect(exampleApplies(demoRoom, { ...exampleNeeds, items: exampleNeeds.items.slice(1) })).toBe(false);
  });
});

describe("autoPlace", () => {
  it("places every requested item without overlaps or door problems in the example room", () => {
    const placements = autoPlace(demoRoom, exampleNeeds, catalogById);
    expect(placements).toHaveLength(exampleNeeds.items.length);
    expect(checkLayout({ room: demoRoom, placements, catalog: catalogById }).violations).toEqual([]);
  });
});
