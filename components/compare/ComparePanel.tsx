"use client";

import { useEffect, useId, useState } from "react";
import { isAiOffline, postJson } from "@/components/flow/api";
import { Spinner } from "@/components/flow/NeedsStep";
import type { RoomPhoto } from "@/components/flow/StartStep";
import { linkButton, primaryButton, secondaryButton } from "@/components/flow/styles";
import type { StageResult } from "@/lib/ai/staging";
import type { NeedItem } from "@/lib/schema";
import { cacheKey, readCached, writeCached } from "./cache";

type ConceptState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string; offline: boolean }
  | { kind: "ready"; url: string };

/** "No preference" reads oddly in an image prompt, so it becomes a plain neutral style. */
const promptStyle = (style?: string) => (!style || style === "No preference" ? "Simple and neutral" : style);

/**
 * T-304: the user's photo next to an AI style concept of it (T-403). The concept is labeled as such
 * everywhere it appears; the checked 2D plan and 3D room stay the source of truth for fit.
 */
export function ComparePanel({ photo, style, items }: { photo: RoomPhoto; style?: string; items: NeedItem[] }) {
  const headingId = useId();
  const styleName = promptStyle(style);
  const [state, setState] = useState<ConceptState>({ kind: "idle" });
  const [key, setKey] = useState<string | null>(null);

  // A concept already made for this photo, style and furniture is shown again without a new call.
  useEffect(() => {
    let live = true;
    void cacheKey(photo.url, styleName, items).then((k) => {
      if (!live) return;
      setKey(k);
      const hit = readCached(k);
      if (hit) setState({ kind: "ready", url: hit });
    });
    return () => {
      live = false;
    };
  }, [photo.url, styleName, items]);

  async function make() {
    setState({ kind: "loading" });
    const data = photo.url.slice(photo.url.indexOf(",") + 1);
    const res = await postJson<StageResult>("/api/stage", {
      photo: { mimeType: "image/jpeg", data },
      style: styleName,
      items,
    });
    if (!res.ok) {
      setState({ kind: "error", message: res.error, offline: isAiOffline(res) });
      return;
    }
    const url = `data:${res.data.image.mimeType};base64,${res.data.image.data}`;
    if (key) writeCached(key, url);
    setState({ kind: "ready", url });
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <h3 id={headingId} className="text-base font-semibold text-stone-900">
          Your photo and a style concept
        </h3>
        <p className="text-sm text-stone-700">
          A picture of how the room could feel in a {styleName.toLowerCase()} style. It is not to scale and the furniture
          may not match the plan. The plan and 3D room below are what we checked.
        </p>
      </div>

      <div className="grid max-w-4xl gap-3 sm:grid-cols-2">
        <figure className="flex flex-col gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL, nothing to optimize */}
          <img src={photo.url} alt="Your photo of the room" className="aspect-[4/3] w-full rounded-lg bg-stone-100 object-cover" />
          <figcaption className="text-sm text-stone-700">Your photo</figcaption>
        </figure>

        <figure className="flex flex-col gap-1">
          <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-lg border border-dashed border-stone-300 bg-stone-50">
            {state.kind === "ready" ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- a generated data URL */}
                <img
                  src={state.url}
                  alt={`AI concept of your room in a ${styleName.toLowerCase()} style. Not to scale.`}
                  className="size-full object-cover"
                />
                <span className="absolute left-2 top-2 rounded bg-stone-900/85 px-2 py-0.5 text-xs font-semibold text-white">
                  AI concept
                </span>
              </>
            ) : state.kind === "loading" ? (
              <p role="status" className="flex items-center gap-2 px-4 text-center text-sm text-stone-700">
                <Spinner /> Making the concept. This can take up to a minute.
              </p>
            ) : state.kind === "error" ? (
              <p role="alert" className="px-4 text-center text-sm text-amber-950">
                {state.offline ? "Style concepts aren't available on this server." : state.message}
              </p>
            ) : (
              <p className="px-4 text-center text-sm text-stone-600">No concept yet</p>
            )}
          </div>
          <figcaption className="text-sm font-medium text-stone-800">
            AI concept, not to scale. The 3D plan is what we checked.
          </figcaption>
        </figure>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {state.kind === "idle" && (
          <button type="button" className={primaryButton} onClick={() => void make()}>
            Make a style concept
          </button>
        )}
        {state.kind === "error" && !state.offline && (
          <button type="button" className={secondaryButton} onClick={() => void make()}>
            Try again
          </button>
        )}
        {state.kind === "ready" && (
          <button type="button" className={linkButton} onClick={() => void make()}>
            Make a new one
          </button>
        )}
        <p className="text-xs text-stone-600">
          Making a concept sends your photo to Google&apos;s Gemini API again. We don&apos;t save it on our server; the result
          stays in this browser tab.
        </p>
      </div>
    </section>
  );
}
