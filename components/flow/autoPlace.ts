import { checkLayout } from "@/lib/geometry";
import type { CatalogItem, ClearanceRequirement, Needs, Placement, Room } from "@/lib/schema";

const STEP = 6;

const area = (c: CatalogItem) => c.width * c.depth;

/**
 * Starting positions for the "arrange it myself" path when the AI is unavailable.
 * Biggest items first, scanning from the north-west corner for the first spot where the item has no problems.
 * Items with no free spot go in the middle, where the checker will flag them.
 */
export function autoPlace(
  room: Room,
  needs: Needs,
  catalog: ReadonlyMap<string, CatalogItem>,
  clearances: ClearanceRequirement[] = [],
): Placement[] {
  const W = room.width.value;
  const D = room.depth.value;
  const own = clearances.filter((c) => c.kind !== "turning_circle");
  const wanted = needs.items
    .flatMap((n) => Array.from({ length: n.quantity }, (_, i) => ({ itemId: n.itemId, id: i === 0 ? n.itemId : `${n.itemId}-${i + 1}` })))
    .filter((w) => catalog.has(w.itemId))
    .sort((a, b) => area(catalog.get(b.itemId)!) - area(catalog.get(a.itemId)!));

  const placed: Placement[] = [];
  for (const w of wanted) {
    const item = catalog.get(w.itemId)!;
    let spot: Placement | null = null;
    search: for (const rotation of [0, 90] as const) {
      const [fw, fd] = rotation === 0 ? [item.width, item.depth] : [item.depth, item.width];
      for (let y = fd / 2; y <= D - fd / 2; y += STEP) {
        for (let x = fw / 2; x <= W - fw / 2; x += STEP) {
          const p: Placement = { id: w.id, itemId: w.itemId, x, y, rotation };
          const { violations } = checkLayout({ room, placements: [...placed, p], catalog, clearances: own });
          if (!violations.some((v) => v.items.includes(w.id))) {
            spot = p;
            break search;
          }
        }
      }
    }
    placed.push(spot ?? { id: w.id, itemId: w.itemId, x: W / 2, y: D / 2, rotation: 0 });
  }
  return placed;
}
