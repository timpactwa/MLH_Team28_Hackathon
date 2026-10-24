import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { ModelCall } from "./model";

const TIMEOUT_MS = 45_000;

export class MissingKeyError extends Error {
  constructor() {
    super("GEMINI_API_KEY is not set on the server.");
  }
}

/**
 * Gemma 4 through the Gemini API. The key stays on the server.
 * The system prompt is sent as the first part of the user turn, which works whether or not the model
 * accepts a separate system instruction. Images go inline and are never uploaded to the Files API.
 */
export function createGemmaCall(): ModelCall {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new MissingKeyError();
  const model = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";
  const ai = new GoogleGenAI({ apiKey });

  return async ({ system, prompt, images = [], label }) => {
    const started = Date.now();
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { text: system },
            ...images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
            { text: prompt },
          ],
        },
      ],
      config: { temperature: 0.4, httpOptions: { timeout: TIMEOUT_MS } },
    });
    const latencyMs = Date.now() - started;
    const usage = {
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    };
    // Cost and latency log for T-408. Never log prompts or images.
    console.info(JSON.stringify({ event: "model_call", label, model, latencyMs, ...usage }));
    return { text: response.text ?? "", latencyMs, usage };
  };
}
