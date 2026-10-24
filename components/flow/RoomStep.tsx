"use client";

import { feetInches } from "@/components/editor/format";
import { PlanView } from "@/components/editor/PlanView";
import { RoomForm } from "@/components/editor/RoomForm";
import { editorReducer, useRoomEditor } from "@/components/editor/useRoomEditor";
import type { Room } from "@/lib/schema";
import type { RoomPhoto } from "./StartStep";
import { StepHeading } from "./StepHeading";
import { linkButton, primaryButton } from "./styles";

/** Step 2: the user checks every measurement. Continuing marks the whole room as confirmed by them. */
export function RoomStep({
  initial,
  photo,
  onConfirm,
  onBack,
  focus,
}: {
  initial: Room;
  /** When the room came from a photo, shown beside the plan so the user can compare. */
  photo?: RoomPhoto;
  onConfirm: (room: Room) => void;
  onBack: () => void;
  focus: boolean;
}) {
  const [state, dispatch, result] = useRoomEditor({ room: initial, placements: [], clearances: [], selectedId: null });
  const { room } = state;
  const estimated = [room.width, room.depth, room.height, ...room.openings.flatMap((o) => [o.offset, o.width])].filter(
    (m) => m.source === "estimated",
  ).length;

  const confirmed = () => editorReducer(state, { type: "confirmAll" }).room;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-2xl flex-col gap-2">
        <StepHeading focusOnMount={focus}>Check the measurements</StepHeading>
        <p className="text-stone-700">
          Every check later is run against these numbers, so they matter more than anything else. Values with a dashed amber
          border are <strong className="font-semibold">estimates</strong>. Change any that are wrong.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <RoomForm room={room} dispatch={dispatch} />
        </div>
        <div className="flex flex-col gap-4">
          {photo && (
            <figure className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-3 sm:flex-row">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL, nothing to optimize */}
              <img src={photo.url} alt="Your photo of the room" className="max-h-56 rounded-lg object-contain sm:w-1/2" />
              <figcaption className="flex flex-col gap-1 text-sm text-stone-700">
                <span className="font-medium text-stone-900">Estimated from your photo</span>
                <span>
                  The wall you were facing is north, left is west, right is east. Sizes from one photo are rough, so measure
                  before you trust them.
                </span>
                {photo.notes && <span className="text-amber-900">Gemma&apos;s note: {photo.notes}</span>}
              </figcaption>
            </figure>
          )}
          <div className="flex min-h-[360px] flex-1 flex-col gap-2 rounded-xl border border-stone-200 bg-white p-2">
            <div className="relative flex-1">
              <div className="absolute inset-0">
                <PlanView
                  room={room}
                  placements={[]}
                  clearances={[]}
                  result={result}
                  selectedId={null}
                  label={`Empty floor plan, ${feetInches(room.width.value)} by ${feetInches(room.depth.value)}, with ${room.openings.length} doors and windows.`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-stone-200 pt-4">
        <button type="button" className={primaryButton} onClick={() => onConfirm(confirmed())}>
          {estimated ? "These are right, continue" : "Continue"}
        </button>
        <button type="button" className={linkButton} onClick={onBack}>
          Back
        </button>
        <p className="text-sm text-stone-600">
          {estimated
            ? `${estimated} value${estimated === 1 ? " is" : "s are"} still estimated. Continuing marks them as confirmed by you.`
            : "Every value is confirmed."}
        </p>
      </div>
    </div>
  );
}
