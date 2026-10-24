import { z } from "zod";

// Units: every length is in inches. The room is a rectangle in plan view.
// Origin is the north-west corner; x runs east along `width`, y runs south along `depth`.

export const Source = z.enum(["estimated", "confirmed"]);
export type Source = z.infer<typeof Source>;

/** A length in inches plus where it came from. Estimates are never shown as measured. */
export const Measure = z.object({
  value: z.number().positive(),
  source: Source,
});
export type Measure = z.infer<typeof Measure>;

/** Like Measure, but zero is allowed: an opening can start right at the corner. */
const OffsetMeasure = Measure.extend({ value: z.number().nonnegative() });

export const Wall = z.enum(["north", "east", "south", "west"]);
export type Wall = z.infer<typeof Wall>;

/**
 * A door or window on one wall.
 * `offset` is the distance from the wall's start to the near edge of the opening:
 * north/south walls start at x = 0, east/west walls start at y = 0.
 */
export const Opening = z.object({
  id: z.string().min(1),
  kind: z.enum(["door", "window"]),
  wall: Wall,
  offset: OffsetMeasure,
  width: Measure,
  /** Doors only. "in" swings into this room; "out" and "none" take no floor space here. */
  swing: z.enum(["in", "out", "none"]).default("in"),
  /** Doors only. Which end of the opening the hinge is on, along the wall direction. */
  hinge: z.enum(["start", "end"]).default("start"),
});
export type Opening = z.infer<typeof Opening>;

export const Room = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  width: Measure,
  depth: Measure,
  height: Measure,
  openings: z.array(Opening),
  /** Shown wherever the room's numbers are shown, e.g. "Example dimensions, not measured." */
  dimensionsNote: z.string().optional(),
});
export type Room = z.infer<typeof Room>;
