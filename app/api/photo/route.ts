import { z } from "zod";
import { createGemmaCall } from "@/lib/ai/gemma";
import { errorResponse, readBody } from "@/lib/ai/http";
import { estimateRoom, PhotoInput } from "@/lib/ai/photo";

const Body = z.object({ photo: PhotoInput });

/** POST { photo: { mimeType, data } } -> { room, notes, usage }. The photo is used once, in memory. */
export async function POST(request: Request) {
  const body = await readBody(request, Body);
  if (body instanceof Response) return body;
  try {
    return Response.json(await estimateRoom(createGemmaCall(), body.photo));
  } catch (e) {
    return errorResponse(e);
  }
}
