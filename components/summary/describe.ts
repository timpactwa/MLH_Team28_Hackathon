import { feetInches } from "@/components/editor/format";
import type { Rect } from "@/lib/geometry";
import type { CatalogItem, Opening, Placement, Room, Wall } from "@/lib/schema";

/** How close (in inches) a footprint must be to a wall to count as against it. */
const TOUCH = 2;

/** Walls the footprint sits against, in north, east, south, west order. */
export function wallsTouched(room: Room, r: Rect): Wall[] {
  const walls: Wall[] = [];
  if (r.minY <= TOUCH) walls.push("north");
  if (r.maxX >= room.width.value - TOUCH) walls.push("east");
  if (r.maxY >= room.depth.value - TOUCH) walls.push("south");
  if (r.minX <= TOUCH) walls.push("west");
  return walls;
}

const CORNERS: Record<string, string> = {
  "north,east": "north-east",
  "east,south": "south-east",
  "south,west": "south-west",
  "north,west": "north-west",
};

/** "In the north-west corner", "Against the east wall", or "Away from the walls". */
export function positionPhrase(room: Room, r: Rect): string {
  const walls = wallsTouched(room, r);
  if (walls.length >= 3) return `Spans the room against the ${walls.join(", ")} walls`;
  if (walls.length === 2) {
    const corner = CORNERS[walls.join(",")];
    return corner ? `In the ${corner} corner` : `Between the ${walls[0]} and ${walls[1]} walls`;
  }
  if (walls.length === 1) return `Against the ${walls[0]} wall`;
  return "Away from the walls";
}

/** Distances from the west and north walls to the footprint's near edges. */
export function offsetsPhrase(r: Rect): string {
  return `${feetInches(Math.max(0, r.minX))} from the west wall, ${feetInches(Math.max(0, r.minY))} from the north wall`;
}

/** Which way the item's long side runs once rotated. */
export function orientationPhrase(p: Placement, item: CatalogItem): string {
  if (item.width === item.depth) return "Square";
  const longAlongX = (item.width > item.depth) === (p.rotation % 180 === 0);
  return longAlongX ? "Long side runs east to west" : "Long side runs north to south";
}

/** Where the offset is measured from, for each wall. */
const START: Record<Wall, string> = { north: "west", south: "west", east: "north", west: "north" };
const END: Record<Wall, string> = { north: "east", south: "east", east: "south", west: "south" };

/** "Door on the south wall, 2 ft 8 in wide, 1 ft from the west end, swings into the room, hinged on the west side." */
export function openingPhrase(o: Opening): string {
  const kind = o.kind === "door" ? "Door" : "Window";
  let text = `${kind} on the ${o.wall} wall, ${feetInches(o.width.value)} wide, ${feetInches(o.offset.value)} from the ${START[o.wall]} end`;
  if (o.kind === "door") {
    text +=
      o.swing === "in"
        ? `, swings into the room, hinged on the ${o.hinge === "start" ? START[o.wall] : END[o.wall]} side`
        : ", swings out of the room";
  }
  return `${text}.`;
}
