import { z } from "zod";
import { NeedItem, type CatalogItem } from "@/lib/schema";
import { ModelOutputError, type ModelResponse } from "./model";
import { PhotoInput } from "./photo";

/** Letters, spaces and a little punctuation only, so the style can't carry instructions into the prompt. */
const Style = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[A-Za-z][A-Za-z \-,&']*$/, "style must be a short name");

export const StageInput = z.object({
  photo: PhotoInput,
  style: Style,
  items: z.array(NeedItem).max(20),
});
export type StageInput = z.infer<typeof StageInput>;

export interface StagedImage {
  mimeType: string;
  data: string;
}

/** One image-editing call. Injected so the route can be tested with a stub. */
export type ImageCall = (req: { prompt: string; image: StagedImage; label: string }) => Promise<
  Omit<ModelResponse, "text"> & { image: StagedImage | null }
>;

export interface StageResult {
  image: StagedImage;
  usage: { calls: number; inputTokens: number; outputTokens: number; latencyMs: number };
}

/**
 * The editing prompt. Furniture names come from our catalog, never from user text, and the room
 * itself must stay as photographed: the result is a style concept, not a checked layout.
 */
export function stagingPrompt(style: string, names: string[]): string {
  const list = names.length ? names.join("; ") : "a few pieces of furniture that suit the room";
  return [
    "Edit this photo of an empty room into a furnished interior design concept.",
    `Style: ${style}.`,
    `Furniture to add: ${list}.`,
    "Keep the walls, floor, ceiling, every door and window, the lighting direction and the camera position exactly as they are.",
    "Do not add, remove, move or resize any door or window, and do not change the room's proportions.",
    "Use furniture of realistic, typical sizes. No people, no text, no watermarks.",
    "Return one photorealistic image.",
  ].join("\n");
}

/** Catalog names for the request, with quantities, e.g. "2 × Bistro table". Unknown ids are dropped. */
export function itemNames(items: StageInput["items"], catalog: ReadonlyMap<string, CatalogItem>): string[] {
  return items.flatMap((i) => {
    const item = catalog.get(i.itemId);
    if (!item) return [];
    return [i.quantity > 1 ? `${i.quantity} × ${item.name}` : item.name];
  });
}

/** Layer (b): the user's photo restyled with their furniture. The photo and result are never stored or logged. */
export async function stagePhoto(
  call: ImageCall,
  input: StageInput,
  catalog: ReadonlyMap<string, CatalogItem>,
): Promise<StageResult> {
  const res = await call({
    prompt: stagingPrompt(input.style, itemNames(input.items, catalog)),
    image: input.photo,
    label: "stage",
  });
  if (!res.image) throw new ModelOutputError("The reply contained no image.");
  return {
    image: res.image,
    usage: { calls: 1, inputTokens: res.usage.inputTokens, outputTokens: res.usage.outputTokens, latencyMs: res.latencyMs },
  };
}
