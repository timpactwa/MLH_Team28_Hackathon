import { z } from "zod";

export const Category = z.enum(["bed", "seating", "table", "desk", "chair", "storage"]);
export type Category = z.infer<typeof Category>;

/** A catalog item with known real-world dimensions in inches (unrotated: width along x, depth along y). */
export const CatalogItem = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: Category,
  width: z.number().positive(),
  depth: z.number().positive(),
  height: z.number().positive(),
  /** Path under /public to a GLB model, or null to render a box at the catalog size. */
  model: z.string().nullable(),
  tags: z.array(z.string()),
});
export type CatalogItem = z.infer<typeof CatalogItem>;

export const Rotation = z.literal([0, 90, 180, 270]);
export type Rotation = z.infer<typeof Rotation>;

/** One placed item. (x, y) is the footprint's center in room coordinates. */
export const Placement = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
  x: z.number(),
  y: z.number(),
  rotation: Rotation,
});
export type Placement = z.infer<typeof Placement>;

export const Layout = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  placements: z.array(Placement),
  rationale: z.string(),
});
export type Layout = z.infer<typeof Layout>;
