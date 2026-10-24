import { z } from "zod";

export const ClearanceRequirement = z.discriminatedUnion("kind", [
  /** A clear circle somewhere on the floor, e.g. 60 in for a wheelchair to turn around. */
  z.object({ kind: z.literal("turning_circle"), diameter: z.number().positive() }),
  /** A clear rectangle inside the room in front of every door, `depth` inches deep. */
  z.object({ kind: z.literal("door_clearance"), depth: z.number().positive() }),
]);
export type ClearanceRequirement = z.infer<typeof ClearanceRequirement>;

export const NeedItem = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().positive(),
});
export type NeedItem = z.infer<typeof NeedItem>;

/** The user's needs: their own words plus the structured version the user can edit. */
export const Needs = z.object({
  text: z.string(),
  items: z.array(NeedItem),
  clearances: z.array(ClearanceRequirement),
  style: z.string().optional(),
});
export type Needs = z.infer<typeof Needs>;
