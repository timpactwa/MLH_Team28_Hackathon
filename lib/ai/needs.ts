import { z } from "zod";
import { catalog } from "@/data/catalog";
import { ClearanceRequirement, type Needs } from "@/lib/schema";
import { emptyUsage, generateJson, type ModelCall, type Usage } from "./model";
import { NEEDS_SYSTEM, needsPrompt } from "./prompts/needs";

const ids = catalog.map((c) => c.id) as [string, ...string[]];

/** What the model may return. Item ids outside the catalog fail validation and trigger a retry. */
export const NeedsReply = z.object({
  items: z.array(z.object({ itemId: z.enum(ids), quantity: z.number().int().min(1).max(6) })).max(20),
  clearances: z.array(ClearanceRequirement).max(2),
  style: z.string().max(80).optional(),
  notes: z.string().max(400).optional(),
});

export interface NeedsResult {
  needs: Needs;
  notes?: string;
  usage: Usage;
}

/** Free text to catalog items and clearance requirements (Gemma job 2). */
export async function interpretNeeds(call: ModelCall, text: string): Promise<NeedsResult> {
  const usage = emptyUsage();
  const reply = await generateJson(call, NeedsReply, { system: NEEDS_SYSTEM, prompt: needsPrompt(text), label: "needs" }, usage);
  // Merge duplicate ids the model may list twice.
  const merged = new Map<string, number>();
  for (const i of reply.items) merged.set(i.itemId, (merged.get(i.itemId) ?? 0) + i.quantity);
  return {
    needs: {
      text,
      items: [...merged].map(([itemId, quantity]) => ({ itemId, quantity })),
      clearances: reply.clearances,
      style: reply.style || undefined,
    },
    notes: reply.notes || undefined,
    usage,
  };
}
