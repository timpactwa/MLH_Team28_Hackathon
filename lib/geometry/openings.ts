import type { Opening, Room, Wall } from "@/lib/schema";
import type { Rect } from "./rect";

/** A rectangle against `wall`, spanning [a0, a1] along it and reaching `depth` into the room. */
export function wallRect(room: Room, wall: Wall, a0: number, a1: number, depth: number): Rect {
  const W = room.width.value;
  const D = room.depth.value;
  switch (wall) {
    case "north":
      return { minX: a0, maxX: a1, minY: 0, maxY: depth };
    case "south":
      return { minX: a0, maxX: a1, minY: D - depth, maxY: D };
    case "west":
      return { minX: 0, maxX: depth, minY: a0, maxY: a1 };
    case "east":
      return { minX: W - depth, maxX: W, minY: a0, maxY: a1 };
  }
}

/** A point on `wall` at distance `a` along it. */
export function wallPoint(room: Room, wall: Wall, a: number): { x: number; y: number } {
  switch (wall) {
    case "north":
      return { x: a, y: 0 };
    case "south":
      return { x: a, y: room.depth.value };
    case "west":
      return { x: 0, y: a };
    case "east":
      return { x: room.width.value, y: a };
  }
}

export function wallLength(room: Room, wall: Wall): number {
  return wall === "north" || wall === "south" ? room.width.value : room.depth.value;
}

/** The opening's span along its wall. */
export function span(opening: Opening): [number, number] {
  return [opening.offset.value, opening.offset.value + opening.width.value];
}

/**
 * The floor a door sweeps: a quarter disc centered on the hinge with the door's width as radius.
 * `bounds` is the quarter disc's bounding square. Null for windows and doors that don't swing in.
 */
export function doorSwing(room: Room, door: Opening): { hinge: { x: number; y: number }; r: number; bounds: Rect } | null {
  if (door.kind !== "door" || door.swing !== "in") return null;
  const [a0, a1] = span(door);
  const r = door.width.value;
  return {
    hinge: wallPoint(room, door.wall, door.hinge === "start" ? a0 : a1),
    r,
    bounds: wallRect(room, door.wall, a0, a1, r),
  };
}

/** The clear rectangle required in front of a door, `depth` inches into the room. */
export function doorClearance(room: Room, door: Opening, depth: number): Rect {
  const [a0, a1] = span(door);
  return wallRect(room, door.wall, a0, a1, depth);
}

export function describeOpening(opening: Opening): string {
  return `${opening.kind} on the ${opening.wall} wall`;
}
