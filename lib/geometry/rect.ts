import type { CatalogItem, Placement } from "@/lib/schema";

/** Axis-aligned rectangle in room coordinates (inches). */
export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Touching edges are not a conflict; anything past this tolerance is. */
export const EPSILON = 0.01;

/** The item's floor footprint. Rotations are right angles, so footprints stay axis-aligned. */
export function footprint(placement: Placement, item: CatalogItem): Rect {
  const turned = placement.rotation === 90 || placement.rotation === 270;
  const w = turned ? item.depth : item.width;
  const d = turned ? item.width : item.depth;
  return {
    minX: placement.x - w / 2,
    minY: placement.y - d / 2,
    maxX: placement.x + w / 2,
    maxY: placement.y + d / 2,
  };
}

export function intersection(a: Rect, b: Rect): Rect | null {
  const r = {
    minX: Math.max(a.minX, b.minX),
    minY: Math.max(a.minY, b.minY),
    maxX: Math.min(a.maxX, b.maxX),
    maxY: Math.min(a.maxY, b.maxY),
  };
  return r.maxX - r.minX > EPSILON && r.maxY - r.minY > EPSILON ? r : null;
}

/** How far two overlapping rectangles would have to move apart: the smaller side of their intersection. */
export function penetration(r: Rect): number {
  return Math.min(r.maxX - r.minX, r.maxY - r.minY);
}

/** Shortest distance from a point to a rectangle (0 if inside). */
export function distanceToRect(x: number, y: number, r: Rect): number {
  const dx = Math.max(r.minX - x, 0, x - r.maxX);
  const dy = Math.max(r.minY - y, 0, y - r.maxY);
  return Math.hypot(dx, dy);
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
