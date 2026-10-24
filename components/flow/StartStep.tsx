"use client";

import { useId, useState } from "react";
import { feetInches } from "@/components/editor/format";
import { demoRoom } from "@/data/demo";
import type { PhotoResult } from "@/lib/ai/photo";
import type { Room } from "@/lib/schema";
import { isAiOffline, postJson } from "./api";
import { Spinner } from "./NeedsStep";
import { preparePhoto } from "./photo";
import { StepHeading } from "./StepHeading";
import { linkButton, primaryButton, secondaryButton } from "./styles";

/** The user's photo, kept in the browser to show next to the estimate. */
export interface RoomPhoto {
  url: string;
  notes?: string;
}

type PhotoState =
  { kind: "idle" } | { kind: "reading"; url: string } | { kind: "error"; message: string; offline: boolean; url?: string };

const guess = (value: number) => ({ value, source: "estimated" as const });

/** A starting point for "my own room": every value is a placeholder until the user confirms it. */
const BLANK_ROOM: Room = {
  id: "my-room",
  name: "My room",
  width: guess(120),
  depth: guess(144),
  height: guess(96),
  dimensionsNote: "Starting values. Replace them with your measurements.",
  openings: [{ id: "door-1", kind: "door", wall: "south", offset: guess(12), width: guess(32), swing: "in", hinge: "start" }],
};

export function StartStep({ onPick, focus }: { onPick: (room: Room, photo?: RoomPhoto) => void; focus: boolean }) {
  const fileId = useId();
  const [photo, setPhoto] = useState<PhotoState>({ kind: "idle" });

  async function onFile(file: File | undefined) {
    if (!file) return;
    let prepared;
    try {
      prepared = await preparePhoto(file);
    } catch (e) {
      setPhoto({ kind: "error", message: e instanceof Error ? e.message : "Could not open that photo.", offline: false });
      return;
    }
    setPhoto({ kind: "reading", url: prepared.url });
    const res = await postJson<PhotoResult>("/api/photo", { photo: { mimeType: prepared.mimeType, data: prepared.data } });
    if (res.ok) {
      onPick(res.data.room, { url: prepared.url, notes: res.data.notes });
    } else {
      setPhoto({ kind: "error", message: res.error, offline: isAiOffline(res), url: prepared.url });
    }
  }

  const preview = photo.kind === "reading" ? photo.url : photo.kind === "error" ? photo.url : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-2xl flex-col gap-2">
        <StepHeading focusOnMount={focus}>Which room are we checking?</StepHeading>
        <p className="text-stone-700">
          Tell us the room and what you need from it. Gemma suggests two layouts, our checker tests every piece against your
          measurements, and you walk through the result in 3D before you sign anything.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <ExampleThumb />
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-stone-900">The example studio</h3>
            <p className="text-sm text-stone-700">
              {feetInches(demoRoom.width.value)} by {feetInches(demoRoom.depth.value)}, one door, two windows.
            </p>
            <p className="text-xs font-medium text-amber-800">{demoRoom.dimensionsNote}</p>
          </div>
          <button type="button" className={`${primaryButton} mt-auto self-start`} onClick={() => onPick(demoRoom)}>
            Use the example studio
          </button>
        </article>

        <article className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local data URL, nothing to optimize
            <img src={preview} alt="Your photo of the room" className="aspect-[4/3] w-full rounded-lg object-cover" />
          ) : (
            <div className="grid aspect-[4/3] place-items-center rounded-lg border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-600">
              A photo of the empty room
            </div>
          )}
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-stone-900">From a photo</h3>
            <p className="text-sm text-stone-700">
              Stand in a corner and take in as much of the room as you can. Gemma estimates the size and finds doors and windows;
              you check every number next.
            </p>
            <p className="text-xs text-stone-600">
              Your photo is shrunk in your browser (location data removed), then sent to Google&apos;s Gemini API to be read. We don&apos;t save it; Google&apos;s API terms cover what happens on their side.
            </p>
          </div>
          <div className="mt-auto flex flex-col gap-2">
            {photo.kind === "reading" ? (
              <p role="status" className="flex items-center gap-2 text-sm text-stone-800">
                <Spinner /> Reading your photo…
              </p>
            ) : (
              <label
                htmlFor={fileId}
                className={`${secondaryButton} cursor-pointer self-start has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-amber-600`}
              >
                {photo.kind === "error" ? "Try another photo" : "Choose a photo"}
                <input
                  id={fileId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    void onFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
            {photo.kind === "error" && (
              <p role="alert" className="text-sm text-amber-950">
                {photo.offline ? "The AI is not connected on this server, so we can't read photos right now." : photo.message}{" "}
                <button type="button" className={linkButton} onClick={() => onPick(BLANK_ROOM)}>
                  Enter the room yourself
                </button>
              </p>
            )}
          </div>
        </article>

        <article className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="grid aspect-[4/3] place-items-center rounded-lg border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-600">
            Your measurements
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-stone-900">My own room</h3>
            <p className="text-sm text-stone-700">
              Enter the width, depth, doors and windows from a listing floor plan or a tape measure.
            </p>
          </div>
          <button type="button" className={`${secondaryButton} mt-auto self-start`} onClick={() => onPick(BLANK_ROOM)}>
            Enter my own room
          </button>
        </article>
      </div>
    </div>
  );
}

/** A small decorative plan of the example room. */
function ExampleThumb() {
  const W = demoRoom.width.value;
  const D = demoRoom.depth.value;
  return (
    <svg viewBox={`-8 -8 ${W + 16} ${D + 16}`} className="aspect-[4/3] w-full rounded-lg bg-stone-50" aria-hidden>
      <rect x={0} y={0} width={W} height={D} className="fill-white stroke-stone-800" strokeWidth={3} />
      <line x1={42} y1={0} x2={102} y2={0} className="stroke-sky-500" strokeWidth={4} />
      <line x1={W} y1={60} x2={W} y2={96} className="stroke-sky-500" strokeWidth={4} />
      <line x1={12} y1={D} x2={44} y2={D} className="stroke-white" strokeWidth={5} />
      <path d={`M 12 ${D} L 12 ${D - 32} A 32 32 0 0 1 44 ${D}`} className="fill-amber-100 stroke-amber-600" strokeWidth={1} />
    </svg>
  );
}
