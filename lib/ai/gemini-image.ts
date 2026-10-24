import "server-only";
import { GoogleGenAI, Modality } from "@google/genai";
import { MissingKeyError } from "./gemma";
import type { ImageCall } from "./staging";

const TIMEOUT_MS = 90_000;

/**
 * Gemini image editing for the staged concept (T-403). Same key as Gemma.
 * The photo goes inline and is never uploaded to the Files API; the result is returned, not kept.
 */
export function createImageCall(): ImageCall {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new MissingKeyError();
  const model = process.env.STAGING_MODEL || "gemini-2.5-flash-image";
  const ai = new GoogleGenAI({ apiKey });

  return async ({ prompt, image, label }) => {
    const started = Date.now();
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ inlineData: image }, { text: prompt }] }],
      config: { responseModalities: [Modality.IMAGE, Modality.TEXT], httpOptions: { timeout: TIMEOUT_MS } },
    });
    const latencyMs = Date.now() - started;
    const usage = {
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    };
    // Cost and latency log for T-408. Never log prompts or images.
    console.info(JSON.stringify({ event: "model_call", label, model, latencyMs, ...usage }));
    const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    const data = part?.inlineData?.data;
    return {
      image: data ? { mimeType: part?.inlineData?.mimeType ?? "image/png", data } : null,
      latencyMs,
      usage,
    };
  };
}
