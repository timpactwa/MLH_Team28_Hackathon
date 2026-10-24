import { describe, expect, it } from "vitest";
import { catalogById } from "@/data/catalog";
import { demoRoom } from "@/data/demo";
import { footprint } from "@/lib/geometry";
import { offsetsPhrase, openingPhrase, orientationPhrase, positionPhrase } from "./describe";

const bed = catalogById.get("bed-full")!;
const sofa = catalogById.get("sofa-loveseat")!;

describe("summary phrases", () => {
  it("names corners, walls and free-standing items", () => {
    expect(positionPhrase(demoRoom, footprint({ id: "b", itemId: bed.id, x: 28, y: 38.5, rotation: 0 }, bed))).toBe(
      "In the north-west corner",
    );
    expect(positionPhrase(demoRoom, footprint({ id: "s", itemId: sofa.id, x: 127, y: 120, rotation: 90 }, sofa))).toBe(
      "Against the east wall",
    );
    expect(positionPhrase(demoRoom, footprint({ id: "s", itemId: sofa.id, x: 72, y: 84, rotation: 0 }, sofa))).toBe(
      "Away from the walls",
    );
  });

  it("gives offsets from the west and north walls", () => {
    expect(offsetsPhrase(footprint({ id: "s", itemId: sofa.id, x: 75, y: 151, rotation: 0 }, sofa))).toBe(
      "3 ft 10 in from the west wall, 11 ft 2 in from the north wall",
    );
  });

  it("describes orientation after rotation", () => {
    expect(orientationPhrase({ id: "s", itemId: sofa.id, x: 0, y: 0, rotation: 0 }, sofa)).toBe("Long side runs east to west");
    expect(orientationPhrase({ id: "s", itemId: sofa.id, x: 0, y: 0, rotation: 90 }, sofa)).toBe("Long side runs north to south");
  });

  it("describes the example door, including which side it is hinged on", () => {
    expect(openingPhrase(demoRoom.openings[0])).toBe(
      "Door on the south wall, 2 ft 8 in wide, 1 ft from the west end, swings into the room, hinged on the west side.",
    );
  });
});
