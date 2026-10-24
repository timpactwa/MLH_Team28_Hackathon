import { z } from "zod";

export const ViolationCode = z.enum([
  "unknown_item",
  "out_of_bounds",
  "overlap",
  "door_swing",
  "door_clearance",
  "no_turning_space",
]);
export type ViolationCode = z.infer<typeof ViolationCode>;

export const Violation = z.object({
  code: ViolationCode,
  /** Placement ids involved, plus opening ids for door violations. */
  items: z.array(z.string()),
  message: z.string(),
  /** How far the conflict extends, in inches, when it has a size. */
  overlapIn: z.number().nonnegative().optional(),
});
export type Violation = z.infer<typeof Violation>;

export const Circle = z.object({ x: z.number(), y: z.number(), r: z.number().positive() });
export type Circle = z.infer<typeof Circle>;

export const CheckResult = z.object({
  ok: z.boolean(),
  violations: z.array(Violation),
  /** Where a requested turning circle fits, for drawing on the plan. */
  turningCircle: Circle.optional(),
});
export type CheckResult = z.infer<typeof CheckResult>;
