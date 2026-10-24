"use client";

import { feetInches } from "@/components/editor/format";
import { demoRoom } from "@/data/demo";
import type { Room } from "@/lib/schema";
import { StepHeading } from "./StepHeading";
import { primaryButton, secondaryButton } from "./styles";

const guess = (value: number) => ({ value, source: "estimated" as const });

/** A starting point for "my own room": every value is a placeholder until the user confirms it. */
const BLANK_ROOM: Room = {
  id: "my-room",
  name: "My room",
  width: guess(120),
  depth: guess(144),
  height: guess(96),
  dimensionsNote: "Starting values. Replace them with your measurements.",
  openings: [
    { id: "door-1", kind: "door", wall: "south", offset: guess(12), width: guess(32), swing: "in", hinge: "start" },
  ],
};

// T-102 adds a third card: upload a photo, get an estimated room, then confirm it in the next step.
export function StartStep({ onPick, focus }: { onPick: (room: Room) => void; focus: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-2xl flex-col gap-2">
        <StepHeading focusOnMount={focus}>Which room are we checking?</StepHeading>
        <p className="text-stone-700">
          Tell us the room and what you need from it. Gemma suggests two layouts, our checker tests every piece against
          your measurements, and you walk through the result in 3D before you sign anything.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
