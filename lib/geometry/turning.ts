import type { Circle, Room } from "@/lib/schema";
import { distanceToRect, EPSILON, type Rect } from "./rect";

/** Grid spacing for candidate centers, in inches. */
const STEP = 2;

/**
 * Finds a clear circle of diameter `diameter` on the floor, or null if none fits.
 * Picks the candidate with the most slack, so the drawn circle sits in the open.
 * Does not check that the circle can be reached from the door.
 */
export function findTurningCircle(room: Room, obstacles: Rect[], diameter: number): Circle | null {
  const r = diameter / 2;
  const W = room.width.value;
  const D = room.depth.value;
  if (W < diameter || D < diameter) return null;

  let best: Circle | null = null;
  let bestSlack = -Infinity;
  for (let x = r; x <= W - r + EPSILON; x += STEP) {
    for (let y = r; y <= D - r + EPSILON; y += STEP) {
      let slack = Math.min(x - r, W - r - x, y - r, D - r - y);
      for (const o of obstacles) {
        slack = Math.min(slack, distanceToRect(x, y, o) - r);
        if (slack < -EPSILON) break;
      }
      if (slack >= -EPSILON && slack > bestSlack) {
        bestSlack = slack;
        best = { x, y, r };
      }
    }
  }
  return best;
}
