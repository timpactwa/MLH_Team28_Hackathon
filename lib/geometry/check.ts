import type {
  CatalogItem,
  CheckResult,
  ClearanceRequirement,
  Placement,
  Room,
  Violation,
} from "@/lib/schema";
import { describeOpening, doorClearance, doorSwing } from "./openings";
import { distanceToRect, footprint, intersection, penetration, round1, type Rect } from "./rect";
import { findTurningCircle } from "./turning";

export interface CheckInput {
  room: Room;
  placements: Placement[];
  catalog: ReadonlyMap<string, CatalogItem>;
  clearances?: ClearanceRequirement[];
}

/**
 * Checks a layout against the room model the user confirmed.
 * Pure and deterministic: runs live in the editor and on the server in the planner loop.
 * These are checks against the supplied model, not proof that every route through the room is passable.
 */
export function checkLayout({ room, placements, catalog, clearances = [] }: CheckInput): CheckResult {
  const violations: Violation[] = [];
  const W = room.width.value;
  const D = room.depth.value;

  const placed: { p: Placement; item: CatalogItem; rect: Rect }[] = [];
  for (const p of placements) {
    const item = catalog.get(p.itemId);
    if (!item) {
      violations.push({ code: "unknown_item", items: [p.id], message: `"${p.itemId}" is not in the furniture catalog.` });
      continue;
    }
    placed.push({ p, item, rect: footprint(p, item) });
  }

  for (const { p, item, rect } of placed) {
    const outside = Math.max(0, -rect.minX, rect.maxX - W, -rect.minY, rect.maxY - D);
    if (outside > 0.01) {
      violations.push({
        code: "out_of_bounds",
        items: [p.id],
        message: `${item.name} extends ${round1(outside)} in past the walls.`,
        overlapIn: round1(outside),
      });
    }
  }

  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      const hit = intersection(a.rect, b.rect);
      if (hit) {
        const by = round1(penetration(hit));
        violations.push({
          code: "overlap",
          items: [a.p.id, b.p.id],
          message: `${a.item.name} overlaps ${b.item.name} by ${by} in.`,
          overlapIn: by,
        });
      }
    }
  }

  const doors = room.openings.filter((o) => o.kind === "door");
  for (const door of doors) {
    const swing = doorSwing(room, door);
    if (!swing) continue;
    for (const { p, item, rect } of placed) {
      const clipped = intersection(rect, swing.bounds);
      if (!clipped) continue;
      const intrusion = swing.r - distanceToRect(swing.hinge.x, swing.hinge.y, clipped);
      if (intrusion > 0.01) {
        violations.push({
          code: "door_swing",
          items: [p.id, door.id],
          message: `${item.name} is in the swing of the ${describeOpening(door)} by ${round1(intrusion)} in.`,
          overlapIn: round1(intrusion),
        });
      }
    }
  }

  for (const req of clearances) {
    if (req.kind !== "door_clearance") continue;
    for (const door of doors) {
      const zone = doorClearance(room, door, req.depth);
      for (const { p, item, rect } of placed) {
        const hit = intersection(rect, zone);
        if (hit) {
          const by = round1(penetration(hit));
          violations.push({
            code: "door_clearance",
            items: [p.id, door.id],
            message: `${item.name} is ${by} in inside the ${req.depth} in clear space in front of the ${describeOpening(door)}.`,
            overlapIn: by,
          });
        }
      }
    }
  }

  let turningCircle: CheckResult["turningCircle"];
  for (const req of clearances) {
    if (req.kind !== "turning_circle") continue;
    const found = findTurningCircle(room, placed.map((x) => x.rect), req.diameter);
    if (found) {
      turningCircle = found;
    } else {
      violations.push({
        code: "no_turning_space",
        items: [],
        message: `There is no clear ${req.diameter} in circle anywhere on the floor with this furniture.`,
      });
    }
  }

  return { ok: violations.length === 0, violations, turningCircle };
}
