import { checkLayout, type CheckInput } from "./check";

/** Offsets within `radius` inches, nearest first. */
function offsets(radius: number): [number, number][] {
  const out: [number, number][] = [];
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) out.push([dx, dy]);
  }
  return out.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
}

/**
 * The closest position (1 in steps, up to `radius` in away) where `placementId` has no violations of its own.
 * Turning-circle requirements are ignored here; the caller re-checks the whole layout afterwards.
 * Returns null if nothing within reach works.
 */
export function nearestFit(input: CheckInput, placementId: string, radius = 36): { x: number; y: number } | null {
  const target = input.placements.find((p) => p.id === placementId);
  if (!target) return null;
  const clearances = (input.clearances ?? []).filter((c) => c.kind !== "turning_circle");
  for (const [dx, dy] of offsets(radius)) {
    const moved = { ...target, x: target.x + dx, y: target.y + dy };
    const placements = input.placements.map((p) => (p.id === placementId ? moved : p));
    const { violations } = checkLayout({ ...input, placements, clearances });
    if (!violations.some((v) => v.items.includes(placementId))) return { x: moved.x, y: moved.y };
  }
  return null;
}
