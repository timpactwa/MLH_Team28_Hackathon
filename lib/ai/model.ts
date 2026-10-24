import type { z } from "zod";

export interface ModelRequest {
  system: string;
  prompt: string;
  /** Inline base64 images. Never written to disk or logged. */
  images?: { mimeType: string; data: string }[];
  /** Short name for logs, e.g. "plan.propose". */
  label: string;
}

export interface ModelResponse {
  text: string;
  latencyMs: number;
  usage: { inputTokens: number; outputTokens: number };
}

/** One model call. Injected so the planner can be tested with a scripted stub. */
export type ModelCall = (req: ModelRequest) => Promise<ModelResponse>;

export interface Usage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export const emptyUsage = (): Usage => ({ calls: 0, inputTokens: 0, outputTokens: 0, latencyMs: 0 });

export function addUsage(total: Usage, r: ModelResponse): void {
  total.calls += 1;
  total.inputTokens += r.usage.inputTokens;
  total.outputTokens += r.usage.outputTokens;
  total.latencyMs += r.latencyMs;
}

export class ModelOutputError extends Error {}

/** Pulls the JSON value out of a reply that may be wrapped in a code fence or prose. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[[{]/);
  const end = Math.max(body.lastIndexOf("}"), body.lastIndexOf("]"));
  if (start === -1 || end < start) throw new ModelOutputError("The reply contained no JSON.");
  return JSON.parse(body.slice(start, end + 1));
}

/**
 * Calls the model and validates its JSON against `schema`.
 * On invalid output, retries once with the validation error appended, then gives up.
 */
export async function generateJson<T>(
  call: ModelCall,
  schema: z.ZodType<T>,
  req: ModelRequest,
  usage: Usage,
  retries = 1,
): Promise<T> {
  let prompt = req.prompt;
  let lastError = "";
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await call({ ...req, prompt });
    addUsage(usage, res);
    try {
      const parsed = schema.safeParse(extractJson(res.text));
      if (parsed.success) return parsed.data;
      lastError = parsed.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    prompt = `${req.prompt}\n\nYour previous reply was invalid (${lastError}). Reply with only the corrected JSON.`;
  }
  throw new ModelOutputError(`Model output failed validation: ${lastError}`);
}
