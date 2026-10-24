import { z } from "zod";
import { createGemmaCall } from "@/lib/ai/gemma";
import { errorResponse, readBody } from "@/lib/ai/http";
import { interpretNeeds } from "@/lib/ai/needs";

const Body = z.object({ text: z.string().trim().min(1).max(2000) });

/** Seconds. One call, plus one retry on invalid JSON. */
export const maxDuration = 60;

/** POST { text } -> { needs, notes, usage }: free text to catalog items and clearances. */
export async function POST(request: Request) {
  const body = await readBody(request, Body);
  if (body instanceof Response) return body;
  try {
    return Response.json(await interpretNeeds(createGemmaCall(), body.text));
  } catch (e) {
    return errorResponse(e);
  }
}
