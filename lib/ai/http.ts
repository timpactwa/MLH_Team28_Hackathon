import "server-only";
import { z } from "zod";
import { MissingKeyError } from "./gemma";
import { ModelOutputError } from "./model";

/** Parses a JSON body against `schema`, or returns a 400 response. */
export async function readBody<T>(request: Request, schema: z.ZodType<T>): Promise<T | Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request.", issues: parsed.error.issues.slice(0, 10) }, { status: 400 });
  }
  return parsed.data;
}

/** Maps planner errors to responses the UI can show. Never echoes model output or user data. */
export function errorResponse(e: unknown): Response {
  if (e instanceof MissingKeyError) {
    return Response.json({ error: "The AI service is not configured on this server." }, { status: 503 });
  }
  if (e instanceof ModelOutputError) {
    return Response.json({ error: "The AI reply could not be used. Please try again." }, { status: 502 });
  }
  // Free-tier keys hit rate limits, and some models need billing. Tell the user it's the key, not them.
  const status = (e as { status?: unknown })?.status;
  if (status === 429) {
    return Response.json({ error: "The AI service is busy or this key's free limit was reached. Try again in a minute." }, { status: 429 });
  }
  if (status === 403) {
    return Response.json({ error: "This AI feature isn't available with the server's key." }, { status: 503 });
  }
  console.error(JSON.stringify({ event: "model_error", message: e instanceof Error ? e.message : String(e) }));
  return Response.json({ error: "The AI service did not respond. Please try again." }, { status: 502 });
}
