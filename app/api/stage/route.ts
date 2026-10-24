import { catalogById } from "@/data/catalog";
import { createImageCall } from "@/lib/ai/gemini-image";
import { errorResponse, readBody } from "@/lib/ai/http";
import { StageInput, stagePhoto } from "@/lib/ai/staging";

/** Seconds. One image call with a 90 s limit. */
export const maxDuration = 120;

/** POST { photo, style, items } -> { image, usage }: a furnished style concept of the user's photo. Nothing is kept. */
export async function POST(request: Request) {
  const body = await readBody(request, StageInput);
  if (body instanceof Response) return body;
  try {
    return Response.json(await stagePhoto(createImageCall(), body, catalogById));
  } catch (e) {
    return errorResponse(e);
  }
}
