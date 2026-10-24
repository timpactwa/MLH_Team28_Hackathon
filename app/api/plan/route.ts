import { z } from "zod";
import { catalogById } from "@/data/catalog";
import { createGemmaCall } from "@/lib/ai/gemma";
import { errorResponse, readBody } from "@/lib/ai/http";
import { planLayouts } from "@/lib/ai/planner";
import { Needs, Room } from "@/lib/schema";

const Body = z.object({ room: Room, needs: Needs });

/** POST { room, needs } -> { options, usage }: two layouts, each checked and revised at most twice. */
export async function POST(request: Request) {
  const body = await readBody(request, Body);
  if (body instanceof Response) return body;
  const unknown = body.needs.items.filter((i) => !catalogById.has(i.itemId)).map((i) => i.itemId);
  if (unknown.length) return Response.json({ error: `Unknown catalog items: ${unknown.join(", ")}` }, { status: 400 });
  try {
    return Response.json(await planLayouts(createGemmaCall(), { ...body, catalog: catalogById }));
  } catch (e) {
    return errorResponse(e);
  }
}
